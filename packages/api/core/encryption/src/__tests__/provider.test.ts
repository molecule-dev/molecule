import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type { EncryptionProvider } from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let encrypt: typeof ProviderModule.encrypt
let decrypt: typeof ProviderModule.decrypt
let hash: typeof ProviderModule.hash
let verify: typeof ProviderModule.verify
let rotateKey: typeof ProviderModule.rotateKey

const makeMockProvider = (overrides?: Partial<EncryptionProvider>): EncryptionProvider => ({
  encrypt: vi.fn().mockResolvedValue('encrypted-data'),
  decrypt: vi.fn().mockResolvedValue('decrypted-data'),
  hash: vi.fn().mockResolvedValue('hashed-data'),
  verify: vi.fn().mockResolvedValue(true),
  rotateKey: vi.fn().mockResolvedValue(undefined),
  ...overrides,
})

describe('encryption provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    encrypt = providerModule.encrypt
    decrypt = providerModule.decrypt
    hash = providerModule.hash
    verify = providerModule.verify
    rotateKey = providerModule.rotateKey
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'Encryption provider not configured. Call setProvider() first.',
      )
    })

    it('should return false when no provider is configured', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should set and get provider', () => {
      const mockProvider = makeMockProvider()
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should return true when provider is configured', () => {
      setProvider(makeMockProvider())
      expect(hasProvider()).toBe(true)
    })
  })

  describe('encrypt', () => {
    it('should throw when no provider is set', async () => {
      await expect(encrypt('plaintext')).rejects.toThrow('Encryption provider not configured')
    })

    it('should delegate to provider encrypt', async () => {
      const mockEncrypt = vi.fn().mockResolvedValue('enc-abc')
      setProvider(makeMockProvider({ encrypt: mockEncrypt }))

      const result = await encrypt('sensitive', 'user:1')

      expect(mockEncrypt).toHaveBeenCalledWith('sensitive', 'user:1')
      expect(result).toBe('enc-abc')
    })

    it('should delegate to provider encrypt without context', async () => {
      const mockEncrypt = vi.fn().mockResolvedValue('enc-def')
      setProvider(makeMockProvider({ encrypt: mockEncrypt }))

      const result = await encrypt('data')

      expect(mockEncrypt).toHaveBeenCalledWith('data', undefined)
      expect(result).toBe('enc-def')
    })
  })

  describe('decrypt', () => {
    it('should throw when no provider is set', async () => {
      await expect(decrypt('ciphertext')).rejects.toThrow('Encryption provider not configured')
    })

    it('should delegate to provider decrypt', async () => {
      const mockDecrypt = vi.fn().mockResolvedValue('plain-abc')
      setProvider(makeMockProvider({ decrypt: mockDecrypt }))

      const result = await decrypt('enc-abc', 'user:1')

      expect(mockDecrypt).toHaveBeenCalledWith('enc-abc', 'user:1')
      expect(result).toBe('plain-abc')
    })

    it('should delegate to provider decrypt without context', async () => {
      const mockDecrypt = vi.fn().mockResolvedValue('plain-def')
      setProvider(makeMockProvider({ decrypt: mockDecrypt }))

      const result = await decrypt('enc-def')

      expect(mockDecrypt).toHaveBeenCalledWith('enc-def', undefined)
      expect(result).toBe('plain-def')
    })
  })

  describe('hash', () => {
    it('should throw when no provider is set', async () => {
      await expect(hash('data')).rejects.toThrow('Encryption provider not configured')
    })

    it('should delegate to provider hash', async () => {
      const mockHash = vi.fn().mockResolvedValue('sha256-abc')
      setProvider(makeMockProvider({ hash: mockHash }))

      const result = await hash('password')

      expect(mockHash).toHaveBeenCalledWith('password')
      expect(result).toBe('sha256-abc')
    })
  })

  describe('verify', () => {
    it('should throw when no provider is set', async () => {
      await expect(verify('data', 'hash')).rejects.toThrow('Encryption provider not configured')
    })

    it('should delegate to provider verify and return true for match', async () => {
      const mockVerify = vi.fn().mockResolvedValue(true)
      setProvider(makeMockProvider({ verify: mockVerify }))

      const result = await verify('password', 'sha256-abc')

      expect(mockVerify).toHaveBeenCalledWith('password', 'sha256-abc')
      expect(result).toBe(true)
    })

    it('should delegate to provider verify and return false for mismatch', async () => {
      const mockVerify = vi.fn().mockResolvedValue(false)
      setProvider(makeMockProvider({ verify: mockVerify }))

      const result = await verify('wrong', 'sha256-abc')

      expect(mockVerify).toHaveBeenCalledWith('wrong', 'sha256-abc')
      expect(result).toBe(false)
    })
  })

  describe('rotateKey', () => {
    it('should throw when no provider is set', async () => {
      await expect(rotateKey('old', 'new')).rejects.toThrow('Encryption provider not configured')
    })

    it('should delegate to provider rotateKey', async () => {
      const mockRotate = vi.fn().mockResolvedValue(undefined)
      setProvider(makeMockProvider({ rotateKey: mockRotate }))

      await rotateKey('old-key', 'new-key')

      expect(mockRotate).toHaveBeenCalledWith('old-key', 'new-key')
    })
  })
})
