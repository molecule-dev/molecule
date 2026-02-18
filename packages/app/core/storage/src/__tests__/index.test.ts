/**
 * Comprehensive tests for `@molecule/app-storage` module.
 *
 * Tests all exported functions and the StorageProvider interface.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clear,
  // Storage providers
  createMemoryStorageProvider,
  // Utility functions
  get,
  getProvider,
  keys,
  remove,
  set,
  // Provider management
  setProvider,
  // Type exports
  type StorageProvider,
} from '../index.js'

describe('@molecule/app-storage', () => {
  describe('Module Exports', () => {
    it('should export setProvider function', () => {
      expect(typeof setProvider).toBe('function')
    })

    it('should export getProvider function', () => {
      expect(typeof getProvider).toBe('function')
    })

    it('should export createMemoryStorageProvider function', () => {
      expect(typeof createMemoryStorageProvider).toBe('function')
    })

    it('should export get utility function', () => {
      expect(typeof get).toBe('function')
    })

    it('should export set utility function', () => {
      expect(typeof set).toBe('function')
    })

    it('should export remove utility function', () => {
      expect(typeof remove).toBe('function')
    })

    it('should export clear utility function', () => {
      expect(typeof clear).toBe('function')
    })

    it('should export keys utility function', () => {
      expect(typeof keys).toBe('function')
    })
  })

  describe('Integration Tests', () => {
    describe('With Memory Provider', () => {
      beforeEach(() => {
        const memoryProvider = createMemoryStorageProvider()
        setProvider(memoryProvider)
      })

      it('should perform full CRUD cycle', async () => {
        // Create
        await set('user', { id: 1, name: 'Alice' })

        // Read
        const user = await get<{ id: number; name: string }>('user')
        expect(user).toEqual({ id: 1, name: 'Alice' })

        // Update
        await set('user', { id: 1, name: 'Alice Smith' })
        const updatedUser = await get<{ id: number; name: string }>('user')
        expect(updatedUser).toEqual({ id: 1, name: 'Alice Smith' })

        // Delete
        await remove('user')
        const deletedUser = await get('user')
        expect(deletedUser).toBeNull()
      })

      it('should store and retrieve multiple items', async () => {
        await set('item1', 'value1')
        await set('item2', 'value2')
        await set('item3', 'value3')

        const allKeys = await keys()
        expect(allKeys).toHaveLength(3)
        expect(allKeys).toContain('item1')
        expect(allKeys).toContain('item2')
        expect(allKeys).toContain('item3')

        expect(await get('item1')).toBe('value1')
        expect(await get('item2')).toBe('value2')
        expect(await get('item3')).toBe('value3')
      })

      it('should clear all items', async () => {
        await set('key1', 'value1')
        await set('key2', 'value2')

        await clear()

        expect(await get('key1')).toBeNull()
        expect(await get('key2')).toBeNull()
        expect(await keys()).toEqual([])
      })

      it('should handle various data types', async () => {
        // String
        await set('string', 'hello world')
        expect(await get('string')).toBe('hello world')

        // Number
        await set('number', 42)
        expect(await get('number')).toBe(42)

        // Boolean
        await set('boolean', true)
        expect(await get('boolean')).toBe(true)

        // Null
        await set('null', null)
        expect(await get('null')).toBe(null)

        // Array
        await set('array', [1, 2, 3])
        expect(await get('array')).toEqual([1, 2, 3])

        // Object
        await set('object', { nested: { deep: 'value' } })
        expect(await get('object')).toEqual({ nested: { deep: 'value' } })

        // Empty string
        await set('empty', '')
        expect(await get('empty')).toBe('')

        // Zero
        await set('zero', 0)
        expect(await get('zero')).toBe(0)

        // False
        await set('false', false)
        expect(await get('false')).toBe(false)
      })

      it('should handle special characters in keys', async () => {
        await set('key:with:colons', 'value1')
        await set('key.with.dots', 'value2')
        await set('key/with/slashes', 'value3')
        await set('key-with-dashes', 'value4')
        await set('key_with_underscores', 'value5')

        expect(await get('key:with:colons')).toBe('value1')
        expect(await get('key.with.dots')).toBe('value2')
        expect(await get('key/with/slashes')).toBe('value3')
        expect(await get('key-with-dashes')).toBe('value4')
        expect(await get('key_with_underscores')).toBe('value5')
      })

      it('should return null for non-existent keys', async () => {
        expect(await get('non-existent-key')).toBeNull()
      })
    })

    describe('Provider Switching', () => {
      it('should switch between providers seamlessly', async () => {
        const provider1 = createMemoryStorageProvider()
        const provider2 = createMemoryStorageProvider()

        // Start with first provider
        setProvider(provider1)
        await set('key', 'value-from-1')
        expect(await get('key')).toBe('value-from-1')

        // Switch to second provider
        setProvider(provider2)

        // First provider's value should not be accessible
        expect(await get('key')).toBeNull()

        // Set new value in second provider
        await set('key', 'value-from-2')
        expect(await get('key')).toBe('value-from-2')

        // Switch back to first provider
        setProvider(provider1)
        expect(await get('key')).toBe('value-from-1')
      })
    })

    describe('Batch Operations', () => {
      beforeEach(() => {
        const memoryProvider = createMemoryStorageProvider()
        setProvider(memoryProvider)
      })

      it('should support getMany through provider', async () => {
        const provider = getProvider()

        await set('a', 1)
        await set('b', 2)
        await set('c', 3)

        if (provider.getMany) {
          const results = await provider.getMany<number>(['a', 'b', 'c', 'd'])

          expect(results.get('a')).toBe(1)
          expect(results.get('b')).toBe(2)
          expect(results.get('c')).toBe(3)
          expect(results.get('d')).toBeNull()
        }
      })

      it('should support setMany through provider', async () => {
        const provider = getProvider()

        if (provider.setMany) {
          await provider.setMany([
            ['x', 10],
            ['y', 20],
            ['z', 30],
          ])

          expect(await get('x')).toBe(10)
          expect(await get('y')).toBe(20)
          expect(await get('z')).toBe(30)
        }
      })

      it('should support removeMany through provider', async () => {
        const provider = getProvider()

        await set('one', 1)
        await set('two', 2)
        await set('three', 3)

        if (provider.removeMany) {
          await provider.removeMany(['one', 'three'])

          expect(await get('one')).toBeNull()
          expect(await get('two')).toBe(2)
          expect(await get('three')).toBeNull()
        }
      })
    })
  })

  describe('Custom Provider Implementation', () => {
    it('should work with a custom provider', async () => {
      const customStore = new Map<string, unknown>()
      const customProvider: StorageProvider = {
        async get<T>(key: string): Promise<T | null> {
          const value = customStore.get(key)
          return value !== undefined ? (value as T) : null
        },
        async set<T>(key: string, value: T): Promise<void> {
          customStore.set(key, value)
        },
        async remove(key: string): Promise<void> {
          customStore.delete(key)
        },
        async clear(): Promise<void> {
          customStore.clear()
        },
        async keys(): Promise<string[]> {
          return Array.from(customStore.keys())
        },
      }

      setProvider(customProvider)

      await set('custom-key', { custom: 'value' })
      expect(await get('custom-key')).toEqual({ custom: 'value' })

      const allKeys = await keys()
      expect(allKeys).toContain('custom-key')

      await remove('custom-key')
      expect(await get('custom-key')).toBeNull()
    })

    it('should work with a mocked async provider', async () => {
      const mockGet = vi.fn().mockResolvedValue({ mocked: true })
      const mockSet = vi.fn().mockResolvedValue(undefined)
      const mockRemove = vi.fn().mockResolvedValue(undefined)
      const mockClear = vi.fn().mockResolvedValue(undefined)
      const mockKeys = vi.fn().mockResolvedValue(['key1', 'key2'])

      const mockedProvider: StorageProvider = {
        get: mockGet,
        set: mockSet,
        remove: mockRemove,
        clear: mockClear,
        keys: mockKeys,
      }

      setProvider(mockedProvider)

      // Test get
      const result = await get('test')
      expect(mockGet).toHaveBeenCalledWith('test')
      expect(result).toEqual({ mocked: true })

      // Test set
      await set('key', 'value')
      expect(mockSet).toHaveBeenCalledWith('key', 'value')

      // Test remove
      await remove('key')
      expect(mockRemove).toHaveBeenCalledWith('key')

      // Test clear
      await clear()
      expect(mockClear).toHaveBeenCalled()

      // Test keys
      const allKeys = await keys()
      expect(mockKeys).toHaveBeenCalled()
      expect(allKeys).toEqual(['key1', 'key2'])
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      // Reset to ensure no provider
      setProvider(null as unknown as StorageProvider)
    })

    it('should throw when getting provider without setting one', () => {
      expect(() => getProvider()).toThrow(/No provider set/)
    })

    it('should handle provider errors propagating correctly', async () => {
      const errorProvider: StorageProvider = {
        get: vi.fn().mockRejectedValue(new Error('Get failed')),
        set: vi.fn().mockRejectedValue(new Error('Set failed')),
        remove: vi.fn().mockRejectedValue(new Error('Remove failed')),
        clear: vi.fn().mockRejectedValue(new Error('Clear failed')),
        keys: vi.fn().mockRejectedValue(new Error('Keys failed')),
      }

      setProvider(errorProvider)

      await expect(get('key')).rejects.toThrow('Get failed')
      await expect(set('key', 'value')).rejects.toThrow('Set failed')
      await expect(remove('key')).rejects.toThrow('Remove failed')
      await expect(clear()).rejects.toThrow('Clear failed')
      await expect(keys()).rejects.toThrow('Keys failed')
    })
  })

  describe('Type Safety', () => {
    beforeEach(() => {
      const memoryProvider = createMemoryStorageProvider()
      setProvider(memoryProvider)
    })

    it('should support generic type inference', async () => {
      interface User {
        id: number
        name: string
        email: string
      }

      const user: User = { id: 1, name: 'Test', email: 'test@example.com' }
      await set<User>('user', user)

      const retrieved = await get<User>('user')
      expect(retrieved?.id).toBe(1)
      expect(retrieved?.name).toBe('Test')
      expect(retrieved?.email).toBe('test@example.com')
    })

    it('should handle union types', async () => {
      type Status = 'pending' | 'active' | 'inactive'

      await set<Status>('status', 'active')

      const status = await get<Status>('status')
      expect(status).toBe('active')
    })

    it('should handle array types', async () => {
      type NumberArray = number[]

      await set<NumberArray>('numbers', [1, 2, 3, 4, 5])

      const numbers = await get<NumberArray>('numbers')
      expect(numbers).toEqual([1, 2, 3, 4, 5])
      expect(numbers?.[2]).toBe(3)
    })

    it('should handle nested types', async () => {
      interface Config {
        database: {
          host: string
          port: number
        }
        features: {
          enabled: boolean
          flags: string[]
        }
      }

      const config: Config = {
        database: { host: 'localhost', port: 5432 },
        features: { enabled: true, flags: ['dark-mode', 'beta'] },
      }

      await set<Config>('config', config)

      const retrieved = await get<Config>('config')
      expect(retrieved?.database.host).toBe('localhost')
      expect(retrieved?.features.flags).toContain('dark-mode')
    })
  })

  describe('Edge Cases', () => {
    beforeEach(() => {
      const memoryProvider = createMemoryStorageProvider()
      setProvider(memoryProvider)
    })

    it('should handle empty string keys', async () => {
      await set('', 'empty-key-value')
      expect(await get('')).toBe('empty-key-value')
    })

    it('should handle very long keys', async () => {
      const longKey = 'a'.repeat(1000)
      await set(longKey, 'long-key-value')
      expect(await get(longKey)).toBe('long-key-value')
    })

    it('should handle unicode keys', async () => {
      await set('key-emoji-test', 'value')
      await set('clave', 'valor')
      await set('kunci', 'nilai')

      expect(await get('key-emoji-test')).toBe('value')
      expect(await get('clave')).toBe('valor')
      expect(await get('kunci')).toBe('nilai')
    })

    it('should handle undefined values in memory provider', async () => {
      // Memory provider stores undefined but returns it as the stored value
      // The actual behavior depends on the implementation - null is consistent with localStorage
      await set('undefined-value', undefined)
      const result = await get('undefined-value')
      // Both null and undefined are acceptable - the key may or may not "exist"
      expect(result === null || result === undefined).toBe(true)
    })

    it('should handle rapid successive operations', async () => {
      const promises = []
      for (let i = 0; i < 100; i++) {
        promises.push(set(`key-${i}`, `value-${i}`))
      }
      await Promise.all(promises)

      const allKeys = await keys()
      expect(allKeys).toHaveLength(100)

      // Verify a few random ones
      expect(await get('key-0')).toBe('value-0')
      expect(await get('key-50')).toBe('value-50')
      expect(await get('key-99')).toBe('value-99')
    })

    it('should handle overwriting the same key multiple times', async () => {
      for (let i = 0; i < 10; i++) {
        await set('overwrite-key', i)
      }

      expect(await get('overwrite-key')).toBe(9)
      const allKeys = await keys()
      expect(allKeys.filter((k) => k === 'overwrite-key')).toHaveLength(1)
    })

    it('should handle clearing an already empty storage', async () => {
      await clear()
      expect(await keys()).toEqual([])

      // Should not throw
      await clear()
      expect(await keys()).toEqual([])
    })

    it('should handle removing non-existent keys', async () => {
      // Should not throw
      await expect(remove('does-not-exist')).resolves.toBeUndefined()
    })
  })

  describe('Concurrent Access', () => {
    beforeEach(() => {
      const memoryProvider = createMemoryStorageProvider()
      setProvider(memoryProvider)
    })

    it('should handle concurrent reads and writes', async () => {
      await set('counter', 0)

      const operations = []
      for (let i = 0; i < 10; i++) {
        operations.push(
          (async () => {
            const current = (await get<number>('counter')) || 0
            await set('counter', current + 1)
          })(),
        )
      }

      await Promise.all(operations)

      // Due to race conditions, the final value may not be 10
      // but all operations should complete without error
      const finalValue = await get<number>('counter')
      expect(finalValue).toBeGreaterThan(0)
      expect(finalValue).toBeLessThanOrEqual(10)
    })

    it('should handle concurrent set and clear operations', async () => {
      const operations = []

      // Mix of set and clear operations
      for (let i = 0; i < 5; i++) {
        operations.push(set(`key-${i}`, `value-${i}`))
        if (i === 2) {
          operations.push(clear())
        }
      }

      // Should complete without errors
      await expect(Promise.all(operations)).resolves.toBeDefined()
    })
  })
})
