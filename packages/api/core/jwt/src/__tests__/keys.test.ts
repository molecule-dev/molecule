vi.mock('@molecule/api-bond', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { generateKeyPairSync, writeKeys } from '../keys.js'

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
