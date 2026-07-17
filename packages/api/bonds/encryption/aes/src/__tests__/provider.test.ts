import { randomBytes } from 'node:crypto'

import { beforeEach, describe, expect, it } from 'vitest'

import { createProvider } from '../provider.js'
import type { AesEncryptionProvider } from '../types.js'

/** Generates a random 256-bit hex key. */
const generateKey = (): string => randomBytes(32).toString('hex')

describe('AES-256-GCM encryption provider', () => {
  let provider: AesEncryptionProvider
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

    it('should still decrypt pre-rotation ciphertext after rotating (transition-safe)', async () => {
      const oldCiphertext = await provider.encrypt('before-rotation')
      expect(oldCiphertext.startsWith('v1:')).toBe(true)

      const newKey = generateKey()
      await provider.rotateKey(testKey, newKey)

      // The whole point: the keyring retains the old key, so ciphertext written
      // before the rotation still decrypts to the original plaintext.
      expect(await provider.decrypt(oldCiphertext)).toBe('before-rotation')
    })

    it('should still decrypt pre-rotation ciphertext that used an AAD context', async () => {
      const context = 'record:99'
      const oldCiphertext = await provider.encrypt('before-rotation', context)

      await provider.rotateKey(testKey, generateKey())

      expect(await provider.decrypt(oldCiphertext, context)).toBe('before-rotation')
    })

    it('should decrypt ciphertext across multiple rotations, each with its own key', async () => {
      const ctV1 = await provider.encrypt('era-1')

      const key2 = generateKey()
      await provider.rotateKey(testKey, key2)
      const ctV2 = await provider.encrypt('era-2')

      const key3 = generateKey()
      await provider.rotateKey(key2, key3)
      const ctV3 = await provider.encrypt('era-3')

      expect(ctV1.startsWith('v1:')).toBe(true)
      expect(ctV2.startsWith('v2:')).toBe(true)
      expect(ctV3.startsWith('v3:')).toBe(true)

      // Every generation still decrypts with its own retained key.
      expect(await provider.decrypt(ctV1)).toBe('era-1')
      expect(await provider.decrypt(ctV2)).toBe('era-2')
      expect(await provider.decrypt(ctV3)).toBe('era-3')
    })

    it('should encrypt new data with the new key after rotation', async () => {
      const newKey = generateKey()
      await provider.rotateKey(testKey, newKey)

      const ciphertext = await provider.encrypt('after-rotation')
      expect(ciphertext.startsWith('v2:')).toBe(true)

      // A fresh provider holding only the NEW key can read post-rotation
      // ciphertext (proving it was encrypted under the new key material)...
      const newOnly = createProvider({ key: newKey, keyVersion: 2 })
      expect(await newOnly.decrypt(ciphertext)).toBe('after-rotation')

      // ...but cannot read pre-rotation ciphertext it never had the key for.
      const oldCiphertext = 'v1:' + ciphertext.slice(3)
      await expect(newOnly.decrypt(oldCiphertext)).rejects.toThrow()
    })
  })

  describe('decrypt key-version selection', () => {
    it('should fail cleanly on a ciphertext missing the v{n} version prefix', async () => {
      // Structurally valid 4-part ciphertext but the first segment is not `v{n}`.
      const valid = await provider.encrypt('data')
      const noVersion = valid.replace(/^v\d+/, 'x9')

      await expect(provider.decrypt(noVersion)).rejects.toThrow(
        'missing or malformed key version prefix',
      )
    })

    it('should fail cleanly (not silently wrong) on an unknown key version', async () => {
      const ciphertext = await provider.encrypt('data')
      const unknownVersion = ciphertext.replace(/^v\d+/, 'v42')

      await expect(provider.decrypt(unknownVersion)).rejects.toThrow(
        'No encryption key available for key version 42',
      )
    })

    it('should seed prior keys so rotated ciphertext decrypts after reconstruction', async () => {
      // Data at rest from before a rotation, encrypted under the v1 key.
      const v1Only = createProvider({ key: testKey, keyVersion: 1 })
      const atRestV1 = await v1Only.encrypt('data-at-rest')
      expect(atRestV1.startsWith('v1:')).toBe(true)

      const key2 = generateKey()

      // A brand-new provider (fresh process, e.g. after a restart) that seeds
      // the historical key can still read the v1 ciphertext.
      const rebuilt = createProvider({
        key: key2,
        keyVersion: 2,
        priorKeys: [{ version: 1, key: testKey }],
      })
      expect(await rebuilt.decrypt(atRestV1)).toBe('data-at-rest')

      // Without the prior key, the same v1 ciphertext fails cleanly.
      const noPrior = createProvider({ key: key2, keyVersion: 2 })
      await expect(noPrior.decrypt(atRestV1)).rejects.toThrow(
        'No encryption key available for key version 1',
      )
    })
  })

  describe('pruneKeyVersions', () => {
    it('should retire old keys and leave later ciphertext undecryptable', async () => {
      const ctV1 = await provider.encrypt('old-era')
      const key2 = generateKey()
      await provider.rotateKey(testKey, key2)

      // Before prune, v1 still decrypts.
      expect(await provider.decrypt(ctV1)).toBe('old-era')

      const pruned = provider.pruneKeyVersions()
      expect(pruned).toEqual([1])

      // After prune, v1 fails cleanly; the current v2 key still works.
      await expect(provider.decrypt(ctV1)).rejects.toThrow(
        'No encryption key available for key version 1',
      )
      const ctV2 = await provider.encrypt('new-era')
      expect(await provider.decrypt(ctV2)).toBe('new-era')
    })

    it('should never prune the current key version', async () => {
      const key2 = generateKey()
      await provider.rotateKey(testKey, key2)

      // Asking to keep nothing must NOT drop the current version.
      const pruned = provider.pruneKeyVersions([])
      expect(pruned).toEqual([1])

      const ciphertext = await provider.encrypt('still-works')
      expect(await provider.decrypt(ciphertext)).toBe('still-works')
    })

    it('should retain explicitly-kept old versions during a staged migration', async () => {
      const ctV1 = await provider.encrypt('gen-1')
      const key2 = generateKey()
      await provider.rotateKey(testKey, key2)
      const ctV2 = await provider.encrypt('gen-2')
      const key3 = generateKey()
      await provider.rotateKey(key2, key3)

      // Keep v1 explicitly; only v2 should be pruned (v3 is current, always kept).
      const pruned = provider.pruneKeyVersions([1])
      expect(pruned).toEqual([2])

      // v1 retained, v2 gone, v3 (current) works.
      expect(await provider.decrypt(ctV1)).toBe('gen-1')
      await expect(provider.decrypt(ctV2)).rejects.toThrow(
        'No encryption key available for key version 2',
      )
      const ctV3 = await provider.encrypt('gen-3')
      expect(await provider.decrypt(ctV3)).toBe('gen-3')
    })
  })
})
