/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real AES bond (Node's
 * crypto — nothing to mock; only `ENCRYPTION_KEY` is set for the test).
 *
 * @module
 */
import { beforeAll, describe, expect, it } from 'vitest'

import { provider as aes } from '@molecule/api-encryption-aes'

import { decrypt, encrypt, setProvider } from '../index.js'

beforeAll(() => {
  // The AES bond's lazy `provider` reads ENCRYPTION_KEY on first use (a 64-hex-char key).
  process.env.ENCRYPTION_KEY = 'a'.repeat(64)
})

describe('README @example', () => {
  it('encrypts a field bound to its record and decrypts it with the same context', async () => {
    setProvider(aes)

    const userId = 'user-123'
    const context = `user:${userId}:taxId`
    const stored = await encrypt('123-45-6789', context)
    expect(stored).toMatch(/^v1:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/)
    expect(stored).not.toContain('123-45-6789')

    const taxId = await decrypt(stored, context)
    expect(taxId).toBe('123-45-6789')

    // A ciphertext copied onto another record does not decrypt.
    await expect(decrypt(stored, 'user:other:taxId')).rejects.toThrow()
  })
})
