import { beforeEach, describe, expect, it, vi } from 'vitest'

import { setProvider } from '../provider.js'
import type { StorageProvider } from '../types.js'
import { clear, get, keys, remove, set } from '../utilities.js'

describe('Storage Utilities', () => {
  let mockProvider: StorageProvider

  beforeEach(() => {
    mockProvider = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      keys: vi.fn().mockResolvedValue([]),
    }
    setProvider(mockProvider)
  })

  describe('get', () => {
    it('should call provider.get with the key', async () => {
      ;(mockProvider.get as ReturnType<typeof vi.fn>).mockResolvedValue('test-value')

      const result = await get('test-key')

      expect(mockProvider.get).toHaveBeenCalledWith('test-key')
      expect(result).toBe('test-value')
    })

    it('should return typed values', async () => {
      interface User {
        id: number
        name: string
      }
      ;(mockProvider.get as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1, name: 'John' })

      const result = await get<User>('user')

      expect(result).toEqual({ id: 1, name: 'John' })
    })
  })

  describe('set', () => {
    it('should call provider.set with key and value', async () => {
      await set('test-key', 'test-value')

      expect(mockProvider.set).toHaveBeenCalledWith('test-key', 'test-value')
    })

    it('should handle complex objects', async () => {
      const complexValue = { nested: { data: [1, 2, 3] } }

      await set('complex', complexValue)

      expect(mockProvider.set).toHaveBeenCalledWith('complex', complexValue)
    })
  })

  describe('remove', () => {
    it('should call provider.remove with the key', async () => {
      await remove('test-key')

      expect(mockProvider.remove).toHaveBeenCalledWith('test-key')
    })
  })

  describe('clear', () => {
    it('should call provider.clear', async () => {
      await clear()

      expect(mockProvider.clear).toHaveBeenCalled()
    })
  })

  describe('keys', () => {
    it('should call provider.keys and return result', async () => {
      ;(mockProvider.keys as ReturnType<typeof vi.fn>).mockResolvedValue(['key1', 'key2', 'key3'])

      const result = await keys()

      expect(mockProvider.keys).toHaveBeenCalled()
      expect(result).toEqual(['key1', 'key2', 'key3'])
    })
  })
})
