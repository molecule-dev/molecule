import { beforeEach, describe, expect, it, vi } from 'vitest'

import { I18nError } from '@molecule/app-i18n'

// -------------------------------------------------------------------
// Mock @molecule/app-storage to provide the StorageProvider type
// -------------------------------------------------------------------

vi.mock('@molecule/app-storage', () => ({}))

import {
  createLocalStorageProvider,
  createSessionStorageProvider,
  provider,
  sessionProvider,
} from '../index.js'
import type { LocalStorageConfig } from '../types.js'

// -------------------------------------------------------------------
// In-memory Storage mock
// -------------------------------------------------------------------

function createMockStorage(): Storage {
  const store = new Map<string, string>()
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value)
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key)
    }),
    clear: vi.fn(() => {
      store.clear()
    }),
    key: vi.fn((index: number) => {
      const keys = Array.from(store.keys())
      return keys[index] ?? null
    }),
    get length() {
      return store.size
    },
  }
}

// -------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------

describe('@molecule/app-storage-localstorage', () => {
  // =================================================================
  // createLocalStorageProvider - basic CRUD
  // =================================================================

  describe('createLocalStorageProvider', () => {
    let mockStorage: Storage

    beforeEach(() => {
      mockStorage = createMockStorage()
    })

    describe('get', () => {
      it('should return null when key does not exist', async () => {
        const storage = createLocalStorageProvider({ storage: mockStorage })

        const result = await storage.get('nonexistent')

        expect(result).toBeNull()
      })

      it('should retrieve a stored string value', async () => {
        const storage = createLocalStorageProvider({ storage: mockStorage })
        await storage.set('name', 'Alice')

        const result = await storage.get<string>('name')

        expect(result).toBe('Alice')
      })

      it('should retrieve a stored object value', async () => {
        const storage = createLocalStorageProvider({ storage: mockStorage })
        const user = { id: 1, name: 'Bob', email: 'bob@test.com' }
        await storage.set('user', user)

        const result = await storage.get<typeof user>('user')

        expect(result).toEqual(user)
      })

      it('should retrieve a stored number value', async () => {
        const storage = createLocalStorageProvider({ storage: mockStorage })
        await storage.set('count', 42)

        const result = await storage.get<number>('count')

        expect(result).toBe(42)
      })

      it('should retrieve a stored boolean value', async () => {
        const storage = createLocalStorageProvider({ storage: mockStorage })
        await storage.set('active', true)

        const result = await storage.get<boolean>('active')

        expect(result).toBe(true)
      })

      it('should retrieve a stored array value', async () => {
        const storage = createLocalStorageProvider({ storage: mockStorage })
        const items = [1, 2, 3, 'four']
        await storage.set('items', items)

        const result = await storage.get<typeof items>('items')

        expect(result).toEqual(items)
      })

      it('should retrieve a stored null value', async () => {
        const storage = createLocalStorageProvider({ storage: mockStorage })
        await storage.set('nullable', null)

        const result = await storage.get('nullable')

        expect(result).toBeNull()
      })

      it('should return null when deserialization fails', async () => {
        const storage = createLocalStorageProvider({ storage: mockStorage })
        // Manually inject invalid JSON into the mock storage
        mockStorage.setItem('broken', 'not valid json{{{')

        const result = await storage.get('broken')

        expect(result).toBeNull()
      })
    })

    describe('set', () => {
      it('should store a string value', async () => {
        const storage = createLocalStorageProvider({ storage: mockStorage })

        await storage.set('key', 'value')

        expect(mockStorage.setItem).toHaveBeenCalledWith('key', '"value"')
      })

      it('should store an object value as JSON', async () => {
        const storage = createLocalStorageProvider({ storage: mockStorage })
        const obj = { a: 1, b: 'two' }

        await storage.set('obj', obj)

        expect(mockStorage.setItem).toHaveBeenCalledWith('obj', JSON.stringify(obj))
      })

      it('should overwrite existing values', async () => {
        const storage = createLocalStorageProvider({ storage: mockStorage })

        await storage.set('key', 'first')
        await storage.set('key', 'second')

        const result = await storage.get<string>('key')
        expect(result).toBe('second')
      })

      it('should throw with descriptive error on QuotaExceededError', async () => {
        const quotaError = new Error('Storage full')
        quotaError.name = 'QuotaExceededError'

        // The provider calls isAvailable() which does a test setItem/removeItem.
        // We need the test key to succeed but the real key to throw.
        const errorStorage = createMockStorage()
        const originalSetItem = errorStorage.setItem as ReturnType<typeof vi.fn>
        originalSetItem.mockImplementation((key: string, _value: string) => {
          // First call is from isAvailable() test - allow it
          if (key === '__storage_test__') return
          throw quotaError
        })

        const storage = createLocalStorageProvider({ storage: errorStorage })

        await expect(storage.set('key', 'value')).rejects.toThrow(
          'Storage quota exceeded when setting key "key"',
        )
      })

      it('should throw I18nError with storage.error.quotaExceeded key on QuotaExceededError', async () => {
        const quotaError = new Error('Storage full')
        quotaError.name = 'QuotaExceededError'

        const errorStorage = createMockStorage()
        const originalSetItem = errorStorage.setItem as ReturnType<typeof vi.fn>
        originalSetItem.mockImplementation((key: string, _value: string) => {
          if (key === '__storage_test__') return
          throw quotaError
        })

        const storage = createLocalStorageProvider({ storage: errorStorage })

        const error = await storage.set('myKey', 'value').catch((e: unknown) => e)
        expect(error).toBeInstanceOf(I18nError)
        expect((error as I18nError).i18nKey).toBe('storage.error.quotaExceeded')
        expect((error as I18nError).i18nValues).toEqual({ key: 'myKey' })
        expect((error as I18nError).cause).toBe(quotaError)
      })

      it('should re-throw non-quota errors', async () => {
        const errorStorage = createMockStorage()
        const originalSetItem = errorStorage.setItem as ReturnType<typeof vi.fn>
        originalSetItem.mockImplementation((key: string, _value: string) => {
          if (key === '__storage_test__') return
          throw new Error('Permission denied')
        })

        const storage = createLocalStorageProvider({ storage: errorStorage })

        await expect(storage.set('key', 'value')).rejects.toThrow('Permission denied')
      })
    })

    describe('remove', () => {
      it('should remove an existing key', async () => {
        const storage = createLocalStorageProvider({ storage: mockStorage })
        await storage.set('key', 'value')

        await storage.remove('key')

        const result = await storage.get('key')
        expect(result).toBeNull()
        expect(mockStorage.removeItem).toHaveBeenCalledWith('key')
      })

      it('should not throw when removing a non-existent key', async () => {
        const storage = createLocalStorageProvider({ storage: mockStorage })

        await expect(storage.remove('nonexistent')).resolves.toBeUndefined()
      })
    })

    describe('clear', () => {
      it('should clear all stored values when no prefix', async () => {
        const storage = createLocalStorageProvider({ storage: mockStorage })
        await storage.set('key1', 'a')
        await storage.set('key2', 'b')

        await storage.clear()

        expect(mockStorage.clear).toHaveBeenCalled()
      })

      it('should only clear prefixed keys when prefix is set', async () => {
        const storage = createLocalStorageProvider({
          storage: mockStorage,
          prefix: 'app_',
        })

        // Set prefixed keys through the provider
        await storage.set('user', 'Alice')
        await storage.set('settings', 'dark')

        // Also set a non-prefixed key directly
        mockStorage.setItem('other_key', '"other"')

        await storage.clear()

        // The non-prefixed key should remain
        expect(mockStorage.getItem('other_key')).toBe('"other"')
      })
    })

    describe('keys', () => {
      it('should return empty array when no keys exist', async () => {
        const storage = createLocalStorageProvider({ storage: mockStorage })

        const keys = await storage.keys()

        expect(keys).toEqual([])
      })

      it('should return all keys', async () => {
        const storage = createLocalStorageProvider({ storage: mockStorage })
        await storage.set('a', 1)
        await storage.set('b', 2)
        await storage.set('c', 3)

        const keys = await storage.keys()

        expect(keys).toHaveLength(3)
        expect(keys).toContain('a')
        expect(keys).toContain('b')
        expect(keys).toContain('c')
      })

      it('should return stripped keys when prefix is set', async () => {
        const storage = createLocalStorageProvider({
          storage: mockStorage,
          prefix: 'test_',
        })

        await storage.set('key1', 'val1')
        await storage.set('key2', 'val2')

        const keys = await storage.keys()

        expect(keys).toHaveLength(2)
        expect(keys).toContain('key1')
        expect(keys).toContain('key2')
      })

      it('should only return keys matching the prefix', async () => {
        const storage = createLocalStorageProvider({
          storage: mockStorage,
          prefix: 'ns_',
        })

        await storage.set('a', 1)
        // Set a non-prefixed key directly
        mockStorage.setItem('other', '"nope"')

        const keys = await storage.keys()

        expect(keys).toHaveLength(1)
        expect(keys).toContain('a')
        expect(keys).not.toContain('other')
      })
    })
  })

  // =================================================================
  // Prefix support
  // =================================================================

  describe('prefix support', () => {
    it('should prefix keys in storage', async () => {
      const mockStorage = createMockStorage()
      const storage = createLocalStorageProvider({
        storage: mockStorage,
        prefix: 'myapp_',
      })

      await storage.set('token', 'abc123')

      expect(mockStorage.setItem).toHaveBeenCalledWith('myapp_token', '"abc123"')
    })

    it('should use prefixed key when getting', async () => {
      const mockStorage = createMockStorage()
      const storage = createLocalStorageProvider({
        storage: mockStorage,
        prefix: 'myapp_',
      })

      await storage.set('token', 'abc123')
      const result = await storage.get<string>('token')

      expect(result).toBe('abc123')
      expect(mockStorage.getItem).toHaveBeenCalledWith('myapp_token')
    })

    it('should use prefixed key when removing', async () => {
      const mockStorage = createMockStorage()
      const storage = createLocalStorageProvider({
        storage: mockStorage,
        prefix: 'myapp_',
      })

      await storage.set('token', 'abc123')
      await storage.remove('token')

      expect(mockStorage.removeItem).toHaveBeenCalledWith('myapp_token')
    })

    it('should work with empty prefix (default)', async () => {
      const mockStorage = createMockStorage()
      const storage = createLocalStorageProvider({
        storage: mockStorage,
        prefix: '',
      })

      await storage.set('key', 'val')

      expect(mockStorage.setItem).toHaveBeenCalledWith('key', '"val"')
    })
  })

  // =================================================================
  // Custom serialization/deserialization
  // =================================================================

  describe('custom serialization', () => {
    it('should use custom serialize function', async () => {
      const mockStorage = createMockStorage()
      const serialize = vi.fn((value: unknown) => `custom:${JSON.stringify(value)}`)

      const storage = createLocalStorageProvider({
        storage: mockStorage,
        serialize,
      })

      await storage.set('key', { name: 'test' })

      expect(serialize).toHaveBeenCalledWith({ name: 'test' })
      expect(mockStorage.setItem).toHaveBeenCalledWith('key', 'custom:{"name":"test"}')
    })

    it('should use custom deserialize function', async () => {
      const mockStorage = createMockStorage()
      const deserialize = vi.fn((value: string) => {
        const stripped = value.replace('custom:', '')
        return JSON.parse(stripped)
      })

      const storage = createLocalStorageProvider({
        storage: mockStorage,
        serialize: (value: unknown) => `custom:${JSON.stringify(value)}`,
        deserialize,
      })

      await storage.set('key', { name: 'test' })
      const result = await storage.get('key')

      expect(deserialize).toHaveBeenCalled()
      expect(result).toEqual({ name: 'test' })
    })

    it('should handle serialize error by re-throwing', async () => {
      const mockStorage = createMockStorage()
      const storage = createLocalStorageProvider({
        storage: mockStorage,
        serialize: () => {
          throw new Error('Serialize failed')
        },
      })

      await expect(storage.set('key', 'value')).rejects.toThrow('Serialize failed')
    })
  })

  // =================================================================
  // Batch operations (getMany, setMany, removeMany)
  // =================================================================

  describe('batch operations', () => {
    let mockStorage: Storage

    beforeEach(() => {
      mockStorage = createMockStorage()
    })

    describe('getMany', () => {
      it('should retrieve multiple values at once', async () => {
        const storage = createLocalStorageProvider({ storage: mockStorage })
        await storage.set('a', 1)
        await storage.set('b', 2)
        await storage.set('c', 3)

        const result = await storage.getMany!<number>(['a', 'b', 'c'])

        expect(result).toBeInstanceOf(Map)
        expect(result.get('a')).toBe(1)
        expect(result.get('b')).toBe(2)
        expect(result.get('c')).toBe(3)
      })

      it('should return null for missing keys', async () => {
        const storage = createLocalStorageProvider({ storage: mockStorage })
        await storage.set('a', 1)

        const result = await storage.getMany!(['a', 'missing'])

        expect(result.get('a')).toBe(1)
        expect(result.get('missing')).toBeNull()
      })

      it('should handle empty keys array', async () => {
        const storage = createLocalStorageProvider({ storage: mockStorage })

        const result = await storage.getMany!([])

        expect(result.size).toBe(0)
      })
    })

    describe('setMany', () => {
      it('should store multiple entries at once', async () => {
        const storage = createLocalStorageProvider({ storage: mockStorage })

        await storage.setMany!([
          ['x', 10],
          ['y', 20],
          ['z', 30],
        ])

        expect(await storage.get<number>('x')).toBe(10)
        expect(await storage.get<number>('y')).toBe(20)
        expect(await storage.get<number>('z')).toBe(30)
      })

      it('should handle empty entries array', async () => {
        const storage = createLocalStorageProvider({ storage: mockStorage })

        await expect(storage.setMany!([])).resolves.toBeUndefined()
      })

      it('should handle mixed value types', async () => {
        const storage = createLocalStorageProvider({ storage: mockStorage })

        await storage.setMany!([
          ['str', 'hello'],
          ['num', 42],
          ['obj', { a: 1 }],
          ['arr', [1, 2]],
        ])

        expect(await storage.get('str')).toBe('hello')
        expect(await storage.get('num')).toBe(42)
        expect(await storage.get('obj')).toEqual({ a: 1 })
        expect(await storage.get('arr')).toEqual([1, 2])
      })
    })

    describe('removeMany', () => {
      it('should remove multiple keys at once', async () => {
        const storage = createLocalStorageProvider({ storage: mockStorage })
        await storage.set('a', 1)
        await storage.set('b', 2)
        await storage.set('c', 3)

        await storage.removeMany!(['a', 'c'])

        expect(await storage.get('a')).toBeNull()
        expect(await storage.get('b')).toBe(2)
        expect(await storage.get('c')).toBeNull()
      })

      it('should handle empty keys array', async () => {
        const storage = createLocalStorageProvider({ storage: mockStorage })

        await expect(storage.removeMany!([])).resolves.toBeUndefined()
      })

      it('should not throw for non-existent keys', async () => {
        const storage = createLocalStorageProvider({ storage: mockStorage })

        await expect(storage.removeMany!(['x', 'y'])).resolves.toBeUndefined()
      })
    })
  })

  // =================================================================
  // In-memory fallback (SSR / no storage)
  // =================================================================

  describe('in-memory fallback', () => {
    it('should fall back to in-memory storage when no storage is available', async () => {
      const storage = createLocalStorageProvider({ storage: undefined })

      await storage.set('key', 'value')
      const result = await storage.get<string>('key')

      expect(result).toBe('value')
    })

    it('should support full CRUD on in-memory fallback', async () => {
      const storage = createLocalStorageProvider({ storage: undefined })

      // Set
      await storage.set('name', 'Alice')
      expect(await storage.get('name')).toBe('Alice')

      // Update
      await storage.set('name', 'Bob')
      expect(await storage.get('name')).toBe('Bob')

      // Keys
      await storage.set('age', 30)
      const keys = await storage.keys()
      expect(keys).toContain('name')
      expect(keys).toContain('age')

      // Remove
      await storage.remove('name')
      expect(await storage.get('name')).toBeNull()

      // Clear
      await storage.clear()
      expect(await storage.keys()).toEqual([])
    })

    it('should fall back when storage is not available (isAvailable returns false)', async () => {
      const brokenStorage: Storage = {
        getItem: vi.fn(),
        setItem: vi.fn(() => {
          throw new Error('No access')
        }),
        removeItem: vi.fn(),
        clear: vi.fn(),
        key: vi.fn(),
        length: 0,
      }

      const storage = createLocalStorageProvider({ storage: brokenStorage })

      // The isAvailable check will fail, so it falls back to in-memory
      await storage.set('key', 'value')
      const result = await storage.get<string>('key')

      expect(result).toBe('value')
    })

    it('should support prefix with in-memory fallback', async () => {
      const storage = createLocalStorageProvider({
        storage: undefined,
        prefix: 'app_',
      })

      await storage.set('token', 'abc')
      expect(await storage.get('token')).toBe('abc')

      const keys = await storage.keys()
      expect(keys).toContain('token')
    })
  })

  // =================================================================
  // createSessionStorageProvider
  // =================================================================

  describe('createSessionStorageProvider', () => {
    it('should create a storage provider', () => {
      // In node environment, window is not defined, so it will use in-memory fallback
      const storage = createSessionStorageProvider()

      expect(storage).toBeDefined()
      expect(typeof storage.get).toBe('function')
      expect(typeof storage.set).toBe('function')
      expect(typeof storage.remove).toBe('function')
      expect(typeof storage.clear).toBe('function')
      expect(typeof storage.keys).toBe('function')
    })

    it('should accept config options', () => {
      const storage = createSessionStorageProvider({
        prefix: 'session_',
      })

      expect(storage).toBeDefined()
    })

    it('should work with CRUD operations (uses in-memory fallback in node)', async () => {
      const storage = createSessionStorageProvider()

      await storage.set('session_key', 'session_value')
      const result = await storage.get<string>('session_key')

      expect(result).toBe('session_value')
    })
  })

  // =================================================================
  // Default providers
  // =================================================================

  describe('provider (default export)', () => {
    it('should be a valid StorageProvider', () => {
      expect(provider).toBeDefined()
      expect(typeof provider.get).toBe('function')
      expect(typeof provider.set).toBe('function')
      expect(typeof provider.remove).toBe('function')
      expect(typeof provider.clear).toBe('function')
      expect(typeof provider.keys).toBe('function')
      expect(typeof provider.getMany).toBe('function')
      expect(typeof provider.setMany).toBe('function')
      expect(typeof provider.removeMany).toBe('function')
    })

    it('should work with CRUD operations (uses in-memory fallback in node)', async () => {
      await provider.set('test', 'hello')
      const result = await provider.get<string>('test')

      expect(result).toBe('hello')

      await provider.remove('test')
      expect(await provider.get('test')).toBeNull()
    })
  })

  describe('sessionProvider (default export)', () => {
    it('should be a valid StorageProvider', () => {
      expect(sessionProvider).toBeDefined()
      expect(typeof sessionProvider.get).toBe('function')
      expect(typeof sessionProvider.set).toBe('function')
      expect(typeof sessionProvider.remove).toBe('function')
      expect(typeof sessionProvider.clear).toBe('function')
      expect(typeof sessionProvider.keys).toBe('function')
    })
  })

  // =================================================================
  // Type exports
  // =================================================================

  describe('type exports', () => {
    it('should export LocalStorageConfig interface (compile-time check)', () => {
      const config: LocalStorageConfig = {
        prefix: 'app_',
        serialize: JSON.stringify,
        deserialize: JSON.parse,
      }
      expect(config).toBeDefined()
    })

    it('should allow empty LocalStorageConfig', () => {
      const config: LocalStorageConfig = {}
      expect(config).toBeDefined()
    })
  })

  // =================================================================
  // Integration tests
  // =================================================================

  describe('integration tests', () => {
    it('should handle full lifecycle: set -> get -> update -> get -> remove -> get', async () => {
      const mockStorage = createMockStorage()
      const storage = createLocalStorageProvider({ storage: mockStorage })

      // Create
      await storage.set('user', { name: 'Alice', age: 30 })
      expect(await storage.get('user')).toEqual({ name: 'Alice', age: 30 })

      // Update
      await storage.set('user', { name: 'Alice', age: 31 })
      expect(await storage.get('user')).toEqual({ name: 'Alice', age: 31 })

      // Delete
      await storage.remove('user')
      expect(await storage.get('user')).toBeNull()
    })

    it('should handle multiple providers with different prefixes on same storage', async () => {
      const mockStorage = createMockStorage()

      const provider1 = createLocalStorageProvider({
        storage: mockStorage,
        prefix: 'app1_',
      })

      const provider2 = createLocalStorageProvider({
        storage: mockStorage,
        prefix: 'app2_',
      })

      await provider1.set('key', 'from_app1')
      await provider2.set('key', 'from_app2')

      expect(await provider1.get('key')).toBe('from_app1')
      expect(await provider2.get('key')).toBe('from_app2')

      const keys1 = await provider1.keys()
      const keys2 = await provider2.keys()

      expect(keys1).toEqual(['key'])
      expect(keys2).toEqual(['key'])
    })

    it('should handle batch operations with prefix', async () => {
      const mockStorage = createMockStorage()
      const storage = createLocalStorageProvider({
        storage: mockStorage,
        prefix: 'batch_',
      })

      await storage.setMany!([
        ['a', 1],
        ['b', 2],
        ['c', 3],
      ])

      const result = await storage.getMany!<number>(['a', 'b', 'c'])

      expect(result.get('a')).toBe(1)
      expect(result.get('b')).toBe(2)
      expect(result.get('c')).toBe(3)

      await storage.removeMany!(['a', 'c'])

      expect(await storage.get('a')).toBeNull()
      expect(await storage.get('b')).toBe(2)
      expect(await storage.get('c')).toBeNull()
    })

    it('should handle storing and retrieving complex nested objects', async () => {
      const mockStorage = createMockStorage()
      const storage = createLocalStorageProvider({ storage: mockStorage })

      const complex = {
        user: {
          id: '123',
          profile: {
            name: 'Test User',
            addresses: [
              { city: 'NYC', zip: '10001' },
              { city: 'LA', zip: '90001' },
            ],
          },
        },
        settings: {
          theme: 'dark',
          notifications: true,
          nested: { deep: { value: 42 } },
        },
      }

      await storage.set('complex', complex)
      const result = await storage.get<typeof complex>('complex')

      expect(result).toEqual(complex)
    })

    it('should handle rapid sequential operations', async () => {
      const mockStorage = createMockStorage()
      const storage = createLocalStorageProvider({ storage: mockStorage })

      for (let i = 0; i < 100; i++) {
        await storage.set(`key-${i}`, i)
      }

      const keys = await storage.keys()
      expect(keys).toHaveLength(100)

      for (let i = 0; i < 100; i++) {
        expect(await storage.get<number>(`key-${i}`)).toBe(i)
      }
    })
  })
})
