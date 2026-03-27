import { randomBytes } from 'node:crypto'

import { beforeEach, describe, expect, it } from 'vitest'

import type { EncryptionProvider } from '@molecule/api-encryption'

import { createProvider } from '../provider.js'

/** Generates a random 256-bit hex key. */
const generateKey = (): string => randomBytes(32).toString('hex')

describe('AES-256-GCM encryption provider', () => {
  let provider: EncryptionProvider
  let testKey: string

  beforeEach(() => {
    testKey = generateKey()
    provider = createProvider({ key: testKey })
  })

  describe('encrypt / decrypt', () => {
    it('should encrypt and decrypt a plaintext string', async () => {
      const plaintext = 'hello world'
      const ciphertext = await provider.encrypt(plaintext)
      const decrypted = await provider.decrypt(ciphertext)

      expect(decrypted).toBe(plaintext)
    })

    it('should produce different ciphertexts for the same plaintext (random IV)', async () => {
      const plaintext = 'same input'
      const ct1 = await provider.encrypt(plaintext)
      const ct2 = await provider.encrypt(plaintext)

      expect(ct1).not.toBe(ct2)
    })

    it('should encrypt and decrypt with AAD context', async () => {
      const plaintext = 'sensitive data'
      const context = 'user:42'

      const ciphertext = await provider.encrypt(plaintext, context)
      const decrypted = await provider.decrypt(ciphertext, context)

      expect(decrypted).toBe(plaintext)
    })

    it('should fail to decrypt with wrong AAD context', async () => {
      const ciphertext = await provider.encrypt('data', 'correct-context')

      await expect(provider.decrypt(ciphertext, 'wrong-context')).rejects.toThrow()
    })

    it('should fail to decrypt with missing AAD context when one was used', async () => {
      const ciphertext = await provider.encrypt('data', 'some-context')

      await expect(provider.decrypt(ciphertext)).rejects.toThrow()
    })

    it('should handle empty strings', async () => {
      const ciphertext = await provider.encrypt('')
      const decrypted = await provider.decrypt(ciphertext)

      expect(decrypted).toBe('')
    })

    it('should handle unicode characters', async () => {
      const plaintext = 'Hello \u{1F600} world \u{00E9}\u{00E0}\u{00FC}\u{00F6}'
      const ciphertext = await provider.encrypt(plaintext)
      const decrypted = await provider.decrypt(ciphertext)

      expect(decrypted).toBe(plaintext)
    })

    it('should handle long strings', async () => {
      const plaintext = 'a'.repeat(10000)
      const ciphertext = await provider.encrypt(plaintext)
      const decrypted = await provider.decrypt(ciphertext)

      expect(decrypted).toBe(plaintext)
    })

    it('should include key version in ciphertext format', async () => {
      const ciphertext = await provider.encrypt('test')

      expect(ciphertext.startsWith('v1:')).toBe(true)
    })

    it('should use custom key version', async () => {
      const versionedProvider = createProvider({ key: testKey, keyVersion: 5 })
      const ciphertext = await versionedProvider.encrypt('test')

      expect(ciphertext.startsWith('v5:')).toBe(true)
    })

    it('should throw on invalid ciphertext format', async () => {
      await expect(provider.decrypt('not-valid-ciphertext')).rejects.toThrow(
        'Invalid ciphertext format',
      )
    })

    it('should throw on tampered ciphertext', async () => {
      const ciphertext = await provider.encrypt('data')
      const parts = ciphertext.split(':')
      // Tamper with the encrypted data
      parts[3] = 'ff'.repeat(parts[3].length / 2)
      const tampered = parts.join(':')

      await expect(provider.decrypt(tampered)).rejects.toThrow()
    })

    it('should fail to decrypt with a different key', async () => {
      const ciphertext = await provider.encrypt('secret')
      const otherProvider = createProvider({ key: generateKey() })

      await expect(otherProvider.decrypt(ciphertext)).rejects.toThrow()
    })
  })

  describe('hash', () => {
    it('should produce a deterministic hash', async () => {
      const hash1 = await provider.hash('test data')
      const hash2 = await provider.hash('test data')

      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different inputs', async () => {
      const hash1 = await provider.hash('input-a')
      const hash2 = await provider.hash('input-b')

      expect(hash1).not.toBe(hash2)
    })

    it('should return a 64-character hex string (SHA-256)', async () => {
      const hashed = await provider.hash('data')

      expect(hashed).toMatch(/^[0-9a-f]{64}$/)
    })
  })

  describe('verify', () => {
    it('should return true for matching data and hash', async () => {
      const data = 'my-password'
      const hashed = await provider.hash(data)

      expect(await provider.verify(data, hashed)).toBe(true)
    })

    it('should return false for non-matching data', async () => {
      const hashed = await provider.hash('original')

      expect(await provider.verify('different', hashed)).toBe(false)
    })

    it('should return false for truncated hash', async () => {
      const hashed = await provider.hash('data')
      const truncated = hashed.slice(0, 32)

      expect(await provider.verify('data', truncated)).toBe(false)
    })
  })

  describe('rotateKey', () => {
    it('should rotate to a new key', async () => {
      const newKey = generateKey()

      await provider.rotateKey(testKey, newKey)

      // New encryptions should work
      const ciphertext = await provider.encrypt('after-rotation')
      const decrypted = await provider.decrypt(ciphertext)
      expect(decrypted).toBe('after-rotation')
    })

    it('should increment key version after rotation', async () => {
      const newKey = generateKey()
      await provider.rotateKey(testKey, newKey)

      const ciphertext = await provider.encrypt('test')
      expect(ciphertext.startsWith('v2:')).toBe(true)
    })

    it('should throw if old key does not match current key', async () => {
      const wrongOldKey = generateKey()
      const newKey = generateKey()

      await expect(provider.rotateKey(wrongOldKey, newKey)).rejects.toThrow(
        'Old key does not match the current encryption key',
      )
    })

    it('should not decrypt old ciphertext with new key (different key material)', async () => {
      const oldCiphertext = await provider.encrypt('before-rotation')

      const newKey = generateKey()
      await provider.rotateKey(testKey, newKey)

      // Old ciphertext was encrypted with old key — decryption with new key fails
      await expect(provider.decrypt(oldCiphertext)).rejects.toThrow()
    })
  })
})
