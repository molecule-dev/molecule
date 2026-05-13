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
