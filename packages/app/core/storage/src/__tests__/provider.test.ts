import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getProvider, setProvider } from '../provider.js'
import type { StorageProvider } from '../types.js'

describe('Storage Provider', () => {
  beforeEach(() => {
    // Reset provider between tests
    setProvider(null as unknown as StorageProvider)
  })

  describe('setProvider / getProvider', () => {
    it('should throw when no provider has been set', () => {
      expect(() => getProvider()).toThrow(/No provider set/)
    })

    it('should return the custom provider after setting it', () => {
      const mockProvider: StorageProvider = {
        get: vi.fn(),
        set: vi.fn(),
        remove: vi.fn(),
        clear: vi.fn(),
        keys: vi.fn(),
      }

      setProvider(mockProvider)
      const provider = getProvider()

      expect(provider).toBe(mockProvider)
    })

    it('should allow overwriting the provider', () => {
      const mockProvider1: StorageProvider = {
        get: vi.fn(),
        set: vi.fn(),
        remove: vi.fn(),
        clear: vi.fn(),
        keys: vi.fn(),
      }

      const mockProvider2: StorageProvider = {
        get: vi.fn(),
        set: vi.fn(),
        remove: vi.fn(),
        clear: vi.fn(),
        keys: vi.fn(),
      }

      setProvider(mockProvider1)
      expect(getProvider()).toBe(mockProvider1)

      setProvider(mockProvider2)
      expect(getProvider()).toBe(mockProvider2)
    })
  })
})
