// `vi.hoisted` (NOT plain module-scope consts) is required here: this file
// has a static top-level `import '../keys.js'` below, and static ES imports
// are always evaluated before any non-hoisted top-level statement — so a
// plain `const mockLoggerWarn = vi.fn()` would still be in its temporal dead
// zone when keys.js's module-load code calls `getLogger()`.
const { mockLoggerWarn, mockLoggerError } = vi.hoisted(() => ({
  mockLoggerWarn: vi.fn(),
  mockLoggerError: vi.fn(),
}))

vi.mock('@molecule/api-bond', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: mockLoggerWarn,
    error: mockLoggerError,
    debug: vi.fn(),
  }),
}))

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { generateKeyPairSync, writeKeys } from '../keys.js'

/** This test file's own directory, used to compute the real legacy keys path. */
const testFileDir = dirname(fileURLToPath(import.meta.url))

describe('generateKeyPairSync', () => {
  it('returns an RSA PEM key pair', () => {
    const { publicKey, privateKey } = generateKeyPairSync()
    expect(typeof publicKey).toBe('string')
    expect(typeof privateKey).toBe('string')
    expect(publicKey).toContain('-----BEGIN PUBLIC KEY-----')
    expect(publicKey).toContain('-----END PUBLIC KEY-----')
    expect(privateKey).toContain('-----BEGIN PRIVATE KEY-----')
    expect(privateKey).toContain('-----END PRIVATE KEY-----')
  })

  it('produces a fresh key on each call (not memoized)', () => {
    const a = generateKeyPairSync()
    const b = generateKeyPairSync()
    expect(a.privateKey).not.toBe(b.privateKey)
    expect(a.publicKey).not.toBe(b.publicKey)
  })
})

describe('writeKeys', () => {
  let outDir: string

  beforeEach(async () => {
    outDir = await mkdtemp(join(tmpdir(), 'mol-jwt-keys-test-'))
  })

  afterEach(async () => {
    await rm(outDir, { recursive: true, force: true })
  })

  it('writes private + public key PEM files to the supplied directory', async () => {
    writeKeys(outDir)

    const privatePem = await readFile(join(outDir, 'jwt_private_key.pem'), 'utf-8')
    const publicPem = await readFile(join(outDir, 'jwt_public_key.pem'), 'utf-8')

    expect(privatePem).toContain('-----BEGIN PRIVATE KEY-----')
    expect(privatePem).toContain('-----END PRIVATE KEY-----')
    expect(publicPem).toContain('-----BEGIN PUBLIC KEY-----')
    expect(publicPem).toContain('-----END PUBLIC KEY-----')
  })

  it('creates the output directory if it does not exist (recursive)', async () => {
    const nested = join(outDir, 'a', 'b', 'c')
    writeKeys(nested)

    const privatePem = await readFile(join(nested, 'jwt_private_key.pem'), 'utf-8')
    expect(privatePem).toContain('-----BEGIN PRIVATE KEY-----')
  })

  it('writes fresh keys on each call (overwrites existing)', async () => {
    writeKeys(outDir)
    const first = await readFile(join(outDir, 'jwt_private_key.pem'), 'utf-8')

    writeKeys(outDir)
    const second = await readFile(join(outDir, 'jwt_private_key.pem'), 'utf-8')

    expect(first).not.toBe(second)
  })
})

describe('env key resolution (half-configured env must never produce a MISMATCHED pair)', () => {
  const originalPrivate = process.env.JWT_PRIVATE_KEY
  const originalPublic = process.env.JWT_PUBLIC_KEY

  /** Re-import keys.js fresh so its module-load resolution sees the current env. */
  const importKeys = async (): Promise<typeof import('../keys.js')> => {
    vi.resetModules()
    return import('../keys.js')
  }

  const restore = (name: string, value: string | undefined): void => {
    if (value === undefined) {
      delete process.env[name]
    } else {
      process.env[name] = value
    }
  }

  afterEach(() => {
    restore('JWT_PRIVATE_KEY', originalPrivate)
    restore('JWT_PUBLIC_KEY', originalPublic)
  })

  it('JWT_PRIVATE_KEY set + JWT_PUBLIC_KEY unset → the public key is DERIVED from the private key', async () => {
    // The regression this pins: previously a half-configured env generated/loaded a
    // fresh UNRELATED key pair on disk and used ITS public key — so every token this
    // process signed failed verification with an unexplained "invalid signature".
    const { privateKey, publicKey } = generateKeyPairSync()
    process.env.JWT_PRIVATE_KEY = privateKey
    delete process.env.JWT_PUBLIC_KEY

    const keys = await importKeys()

    expect(keys.JWT_PRIVATE_KEY.toString()).toBe(privateKey)
    // The derived public key is EXACTLY the pair's public half — a matching pair by
    // construction, provable without any crypto roundtrip.
    expect(keys.JWT_PUBLIC_KEY.toString().replace(/\s+/g, '')).toBe(publicKey.replace(/\s+/g, ''))
  })

  it('derives correctly from a single-line env value with literal \\n escapes (dotenv-style)', async () => {
    const { privateKey, publicKey } = generateKeyPairSync()
    process.env.JWT_PRIVATE_KEY = privateKey.replace(/\n/g, '\\n')
    delete process.env.JWT_PUBLIC_KEY

    const keys = await importKeys()

    expect(keys.JWT_PRIVATE_KEY.toString()).toBe(privateKey)
    expect(keys.JWT_PUBLIC_KEY.toString().replace(/\s+/g, '')).toBe(publicKey.replace(/\s+/g, ''))
  })

  it('both env vars set → both are used verbatim (no derivation, no disk)', async () => {
    const pair = generateKeyPairSync()
    process.env.JWT_PRIVATE_KEY = pair.privateKey
    process.env.JWT_PUBLIC_KEY = pair.publicKey

    const keys = await importKeys()

    expect(keys.JWT_PRIVATE_KEY.toString()).toBe(pair.privateKey)
    expect(keys.JWT_PUBLIC_KEY.toString()).toBe(pair.publicKey)
  })
})

describe('default keys directory (JWT_KEYS_DIR override + legacy node_modules migration)', () => {
  const originalNodeEnv = process.env.NODE_ENV
  const originalKeysDir = process.env.JWT_KEYS_DIR
  const originalPrivate = process.env.JWT_PRIVATE_KEY
  const originalPublic = process.env.JWT_PUBLIC_KEY

  // A per-test NODE_ENV isolates each run's legacy directory
  // (`core/.keys/{NODE_ENV}`) so tests never read or mutate the real
  // development/test key pairs that live on disk in this monorepo.
  let uniqueEnv: string
  let legacyDir: string
  let cwdSpy: ReturnType<typeof vi.spyOn> | undefined
  let tmpCwd: string

  const importKeys = async (): Promise<typeof import('../keys.js')> => {
    vi.resetModules()
    return import('../keys.js')
  }

  beforeEach(async () => {
    uniqueEnv = `jwt-keys-migration-${Date.now()}-${Math.random().toString(36).slice(2)}`
    process.env.NODE_ENV = uniqueEnv
    delete process.env.JWT_KEYS_DIR
    delete process.env.JWT_PRIVATE_KEY
    delete process.env.JWT_PUBLIC_KEY
    mockLoggerWarn.mockClear()
    mockLoggerError.mockClear()

    // Mirrors keys.ts's own `path.join(__dirname, '../../.keys/{NODE_ENV}')`
    // computation, one directory deeper because this test file lives in
    // `src/__tests__/` rather than `src/`.
    legacyDir = join(testFileDir, '../../../.keys', uniqueEnv)

    tmpCwd = await mkdtemp(join(tmpdir(), 'mol-jwt-cwd-test-'))
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpCwd)
  })

  const restore = (name: string, value: string | undefined): void => {
    if (value === undefined) {
      delete process.env[name]
    } else {
      process.env[name] = value
    }
  }

  afterEach(async () => {
    cwdSpy?.mockRestore()
    await rm(tmpCwd, { recursive: true, force: true })
    await rm(legacyDir, { recursive: true, force: true })
    restore('JWT_KEYS_DIR', originalKeysDir)
    restore('JWT_PRIVATE_KEY', originalPrivate)
    restore('JWT_PUBLIC_KEY', originalPublic)
    restore('NODE_ENV', originalNodeEnv)
  })

  it('defaults to `${cwd}/.keys/{NODE_ENV}` — NOT the legacy node_modules-relative path', async () => {
    const keys = await importKeys()

    // The regression this pins: the OLD default lived one level above the
    // package root (inside `node_modules` for an installed app), where any
    // reinstall/`npm ci` silently wipes it. The new default is anchored to
    // the app's own working directory, which reinstalls never touch.
    const expectedPath = join(tmpCwd, '.keys', uniqueEnv, 'jwt_private_key.pem')
    await expect(readFile(expectedPath, 'utf8')).resolves.toContain('-----BEGIN PRIVATE KEY-----')
    expect(keys.JWT_PRIVATE_KEY.toString()).toContain('-----BEGIN PRIVATE KEY-----')
  })

  it('honors JWT_KEYS_DIR to relocate the keys directory', async () => {
    const explicitDir = await mkdtemp(join(tmpdir(), 'mol-jwt-explicit-dir-'))
    process.env.JWT_KEYS_DIR = explicitDir

    try {
      await importKeys()

      const expectedPath = join(explicitDir, uniqueEnv, 'jwt_private_key.pem')
      await expect(readFile(expectedPath, 'utf8')).resolves.toContain('-----BEGIN PRIVATE KEY-----')
      // Nothing was written under the mocked cwd default location.
      await expect(
        readFile(join(tmpCwd, '.keys', uniqueEnv, 'jwt_private_key.pem'), 'utf8'),
      ).rejects.toThrow()
    } finally {
      await rm(explicitDir, { recursive: true, force: true })
    }
  })

  it('migrates a pre-existing legacy (node_modules-relative) key pair forward instead of regenerating', async () => {
    // Simulate a pair left behind by a pre-fix version of this package at
    // the legacy `node_modules`-relative location.
    const legacyPair = generateKeyPairSync()
    await mkdir(legacyDir, { recursive: true })
    await writeFile(join(legacyDir, 'jwt_private_key.pem'), legacyPair.privateKey, 'utf8')
    await writeFile(join(legacyDir, 'jwt_public_key.pem'), legacyPair.publicKey, 'utf8')

    const keys = await importKeys()

    // The EXACT legacy pair was reused, not a fresh one generated — a fresh
    // pair would silently invalidate every existing session and signed link.
    expect(keys.JWT_PRIVATE_KEY.toString()).toBe(legacyPair.privateKey)
    expect(keys.JWT_PUBLIC_KEY.toString()).toBe(legacyPair.publicKey)

    // Copied forward to the new stable location so future boots (after the
    // legacy `node_modules` dir is wiped by a reinstall) still find it.
    const migratedPath = join(tmpCwd, '.keys', uniqueEnv, 'jwt_private_key.pem')
    await expect(readFile(migratedPath, 'utf8')).resolves.toBe(legacyPair.privateKey)

    // The migration is a boot-time, actionable signal — not silent.
    expect(mockLoggerWarn).toHaveBeenCalledWith(expect.stringContaining('Migrated JWT keys'))
  })

  it('generates a fresh pair (no migration) when no legacy pair exists', async () => {
    const keys = await importKeys()

    expect(keys.JWT_PRIVATE_KEY.toString()).toContain('-----BEGIN PRIVATE KEY-----')
    // No migration occurred, so no migration warning was logged.
    expect(mockLoggerWarn).not.toHaveBeenCalledWith(expect.stringContaining('Migrated JWT keys'))
  })
})
