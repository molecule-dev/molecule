import { beforeEach, describe, expect, it, vi } from 'vitest'

// -------------------------------------------------------------------
// Mock peer dependencies
// -------------------------------------------------------------------

vi.mock('@molecule/app-storage', () => ({}))
vi.mock('@molecule/app-i18n', () => ({
  t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))
vi.mock('@molecule/app-logger', () => ({
  getLogger: () => ({
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}))

// -------------------------------------------------------------------
// In-memory AsyncStorage mock
// -------------------------------------------------------------------

const store = new Map<string, string>()

const mockAsyncStorage = {
  getItem: vi.fn(async (key: string) => store.get(key) ?? null),
  setItem: vi.fn(async (key: string, value: string) => {
    store.set(key, value)
  }),
  removeItem: vi.fn(async (key: string) => {
    store.delete(key)
  }),
  clear: vi.fn(async () => {
    store.clear()
  }),
  getAllKeys: vi.fn(async () => Array.from(store.keys())),
  multiGet: vi.fn(async (keys: string[]) =>
    keys.map((key) => [key, store.get(key) ?? null] as [string, string | null]),
  ),
  multiSet: vi.fn(async (pairs: Array<[string, string]>) => {
    for (const [key, value] of pairs) {
      store.set(key, value)
    }
  }),
  multiRemove: vi.fn(async (keys: string[]) => {
    for (const key of keys) {
      store.delete(key)
    }
  }),
}

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: mockAsyncStorage,
}))

// -------------------------------------------------------------------
// Import the module under test (after mocks are set up)
// -------------------------------------------------------------------

import { createAsyncStorageProvider, provider } from '../index.js'
import type { AsyncStorageConfig } from '../types.js'

// -------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------

describe('@molecule/app-storage-async-storage', () => {
  beforeEach(() => {
    store.clear()
    vi.clearAllMocks()
  })

  // =================================================================
  // createAsyncStorageProvider - basic CRUD
  // =================================================================

  describe('createAsyncStorageProvider', () => {
    describe('get', () => {
      it('should return null when key does not exist', async () => {
        const storage = createAsyncStorageProvider()

        const result = await storage.get('nonexistent')

        expect(result).toBeNull()
      })

      it('should retrieve a stored string value', async () => {
        const storage = createAsyncStorageProvider()
        await storage.set('name', 'Alice')

        const result = await storage.get<string>('name')

        expect(result).toBe('Alice')
      })

      it('should retrieve a stored object value', async () => {
        const storage = createAsyncStorageProvider()
        const user = { id: 1, name: 'Bob', email: 'bob@test.com' }
        await storage.set('user', user)

        const result = await storage.get<typeof user>('user')

        expect(result).toEqual(user)
      })

      it('should retrieve a stored number value', async () => {
        const storage = createAsyncStorageProvider()
        await storage.set('count', 42)

        const result = await storage.get<number>('count')

        expect(result).toBe(42)
      })

      it('should retrieve a stored boolean value', async () => {
        const storage = createAsyncStorageProvider()
        await storage.set('active', true)

        const result = await storage.get<boolean>('active')

        expect(result).toBe(true)
      })

      it('should retrieve a stored array value', async () => {
        const storage = createAsyncStorageProvider()
        const items = [1, 2, 3, 'four']
        await storage.set('items', items)

        const result = await storage.get<typeof items>('items')

        expect(result).toEqual(items)
      })

      it('should retrieve a stored null value', async () => {
        const storage = createAsyncStorageProvider()
        await storage.set('nullable', null)

        const result = await storage.get('nullable')

        expect(result).toBeNull()
      })

      it('should return null when deserialization fails', async () => {
        const storage = createAsyncStorageProvider()
        // Manually inject invalid JSON into the mock store
        store.set('broken', 'not valid json{{{')

        const result = await storage.get('broken')

        expect(result).toBeNull()
      })
    })

    describe('set', () => {
      it('should store a string value', async () => {
        const storage = createAsyncStorageProvider()

        await storage.set('key', 'value')

        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('key', '"value"')
      })

      it('should store an object value as JSON', async () => {
        const storage = createAsyncStorageProvider()
        const obj = { a: 1, b: 'two' }

        await storage.set('obj', obj)

        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('obj', JSON.stringify(obj))
      })

      it('should overwrite existing values', async () => {
        const storage = createAsyncStorageProvider()

        await storage.set('key', 'first')
        await storage.set('key', 'second')

        const result = await storage.get<string>('key')
        expect(result).toBe('second')
      })

      it('should throw with descriptive error when setItem fails', async () => {
        mockAsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage full'))

        const storage = createAsyncStorageProvider()

        await expect(storage.set('key', 'value')).rejects.toThrow(
          'Failed to set value for key "key" in AsyncStorage',
        )
      })
    })

    describe('remove', () => {
      it('should remove an existing key', async () => {
        const storage = createAsyncStorageProvider()
        await storage.set('key', 'value')

        await storage.remove('key')

        const result = await storage.get('key')
        expect(result).toBeNull()
        expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('key')
      })

      it('should not throw when removing a non-existent key', async () => {
        const storage = createAsyncStorageProvider()

        await expect(storage.remove('nonexistent')).resolves.toBeUndefined()
      })
    })

    describe('clear', () => {
      it('should clear all stored values when no prefix', async () => {
        const storage = createAsyncStorageProvider()
        await storage.set('key1', 'a')
        await storage.set('key2', 'b')

        await storage.clear()

        expect(mockAsyncStorage.clear).toHaveBeenCalled()
      })

      it('should only clear prefixed keys when prefix is set', async () => {
        const storage = createAsyncStorageProvider({ prefix: 'app_' })

        // Set prefixed keys through the provider
        await storage.set('user', 'Alice')
        await storage.set('settings', 'dark')

        // Also set a non-prefixed key directly
        store.set('other_key', '"other"')

        await storage.clear()

        // The non-prefixed key should remain
        expect(store.get('other_key')).toBe('"other"')
      })

      it('should call multiRemove for prefixed keys', async () => {
        const storage = createAsyncStorageProvider({ prefix: 'ns_' })
        await storage.set('a', 1)
        await storage.set('b', 2)

        await storage.clear()

        expect(mockAsyncStorage.multiRemove).toHaveBeenCalledWith(['ns_a', 'ns_b'])
      })

      it('should not call multiRemove when no prefixed keys exist', async () => {
        const storage = createAsyncStorageProvider({ prefix: 'empty_' })

        await storage.clear()

        expect(mockAsyncStorage.multiRemove).not.toHaveBeenCalled()
      })
    })

    describe('keys', () => {
      it('should return empty array when no keys exist', async () => {
        const storage = createAsyncStorageProvider()

        const keys = await storage.keys()

        expect(keys).toEqual([])
      })

      it('should return all keys', async () => {
        const storage = createAsyncStorageProvider()
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
        const storage = createAsyncStorageProvider({ prefix: 'test_' })

        await storage.set('key1', 'val1')
        await storage.set('key2', 'val2')

        const keys = await storage.keys()

        expect(keys).toHaveLength(2)
        expect(keys).toContain('key1')
        expect(keys).toContain('key2')
      })

      it('should only return keys matching the prefix', async () => {
        const storage = createAsyncStorageProvider({ prefix: 'ns_' })

        await storage.set('a', 1)
        // Set a non-prefixed key directly
        store.set('other', '"nope"')

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
      const storage = createAsyncStorageProvider({ prefix: 'myapp_' })

      await storage.set('token', 'abc123')

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('myapp_token', '"abc123"')
    })

    it('should use prefixed key when getting', async () => {
      const storage = createAsyncStorageProvider({ prefix: 'myapp_' })

      await storage.set('token', 'abc123')
      const result = await storage.get<string>('token')

      expect(result).toBe('abc123')
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('myapp_token')
    })

    it('should use prefixed key when removing', async () => {
      const storage = createAsyncStorageProvider({ prefix: 'myapp_' })

      await storage.set('token', 'abc123')
      await storage.remove('token')

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('myapp_token')
    })

    it('should work with empty prefix (default)', async () => {
      const storage = createAsyncStorageProvider({ prefix: '' })

      await storage.set('key', 'val')

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('key', '"val"')
    })
  })

  // =================================================================
  // Custom serialization/deserialization
  // =================================================================

  describe('custom serialization', () => {
    it('should use custom serialize function', async () => {
      const serialize = vi.fn((value: unknown) => `custom:${JSON.stringify(value)}`)

      const storage = createAsyncStorageProvider({ serialize })

      await storage.set('key', { name: 'test' })

      expect(serialize).toHaveBeenCalledWith({ name: 'test' })
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('key', 'custom:{"name":"test"}')
    })

    it('should use custom deserialize function', async () => {
      const deserialize = vi.fn((value: string) => {
        const stripped = value.replace('custom:', '')
        return JSON.parse(stripped)
      })

      const storage = createAsyncStorageProvider({
        serialize: (value: unknown) => `custom:${JSON.stringify(value)}`,
        deserialize,
      })

      await storage.set('key', { name: 'test' })
      const result = await storage.get('key')

      expect(deserialize).toHaveBeenCalled()
      expect(result).toEqual({ name: 'test' })
    })

    it('should throw when serialize function fails during set', async () => {
      const storage = createAsyncStorageProvider({
        serialize: () => {
          throw new Error('Serialize failed')
        },
      })

      await expect(storage.set('key', 'value')).rejects.toThrow()
    })
  })

  // =================================================================
  // Batch operations (getMany, setMany, removeMany)
  // =================================================================

  describe('batch operations', () => {
    describe('getMany', () => {
      it('should retrieve multiple values at once', async () => {
        const storage = createAsyncStorageProvider()
        await storage.set('a', 1)
        await storage.set('b', 2)
        await storage.set('c', 3)

        const result = await storage.getMany<number>(['a', 'b', 'c'])

        expect(result).toBeInstanceOf(Map)
        expect(result.get('a')).toBe(1)
        expect(result.get('b')).toBe(2)
        expect(result.get('c')).toBe(3)
      })

      it('should return null for missing keys', async () => {
        const storage = createAsyncStorageProvider()
        await storage.set('a', 1)

        const result = await storage.getMany(['a', 'missing'])

        expect(result.get('a')).toBe(1)
        expect(result.get('missing')).toBeNull()
      })

      it('should handle empty keys array', async () => {
        const storage = createAsyncStorageProvider()

        const result = await storage.getMany([])

        expect(result.size).toBe(0)
      })

      it('should return null for values that fail deserialization', async () => {
        const storage = createAsyncStorageProvider()
        // Set a valid value and an invalid one directly
        store.set('good', '"hello"')
        store.set('bad', 'not valid json{{{')

        const result = await storage.getMany(['good', 'bad'])

        expect(result.get('good')).toBe('hello')
        expect(result.get('bad')).toBeNull()
      })
    })

    describe('setMany', () => {
      it('should store multiple entries at once', async () => {
        const storage = createAsyncStorageProvider()

        await storage.setMany([
          ['x', 10],
          ['y', 20],
          ['z', 30],
        ])

        expect(await storage.get<number>('x')).toBe(10)
        expect(await storage.get<number>('y')).toBe(20)
        expect(await storage.get<number>('z')).toBe(30)
      })

      it('should call multiSet on AsyncStorage', async () => {
        const storage = createAsyncStorageProvider()

        await storage.setMany([
          ['a', 1],
          ['b', 2],
        ])

        expect(mockAsyncStorage.multiSet).toHaveBeenCalledWith([
          ['a', '1'],
          ['b', '2'],
        ])
      })

      it('should handle empty entries array', async () => {
        const storage = createAsyncStorageProvider()

        await expect(storage.setMany([])).resolves.toBeUndefined()
      })

      it('should handle mixed value types', async () => {
        const storage = createAsyncStorageProvider()

        await storage.setMany([
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
        const storage = createAsyncStorageProvider()
        await storage.set('a', 1)
        await storage.set('b', 2)
        await storage.set('c', 3)

        await storage.removeMany(['a', 'c'])

        expect(await storage.get('a')).toBeNull()
        expect(await storage.get('b')).toBe(2)
        expect(await storage.get('c')).toBeNull()
      })

      it('should call multiRemove on AsyncStorage', async () => {
        const storage = createAsyncStorageProvider()

        await storage.removeMany(['x', 'y'])

        expect(mockAsyncStorage.multiRemove).toHaveBeenCalledWith(['x', 'y'])
      })

      it('should handle empty keys array', async () => {
        const storage = createAsyncStorageProvider()

        await expect(storage.removeMany([])).resolves.toBeUndefined()
      })

      it('should not throw for non-existent keys', async () => {
        const storage = createAsyncStorageProvider()

        await expect(storage.removeMany(['x', 'y'])).resolves.toBeUndefined()
      })
    })
  })

  // =================================================================
  // Default provider
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

    it('should work with CRUD operations', async () => {
      await provider.set('test', 'hello')
      const result = await provider.get<string>('test')

      expect(result).toBe('hello')

      await provider.remove('test')
      expect(await provider.get('test')).toBeNull()
    })
  })

  // =================================================================
  // Error handling — AsyncStorage unavailable
  // =================================================================

  describe('error handling', () => {
    it('get should return null when AsyncStorage getItem rejects', async () => {
      mockAsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage error'))

      const storage = createAsyncStorageProvider()
      const result = await storage.get('key')

      expect(result).toBeNull()
    })

    it('set should throw wrapped error when AsyncStorage setItem rejects', async () => {
      mockAsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage full'))

      const storage = createAsyncStorageProvider()

      await expect(storage.set('key', 'value')).rejects.toThrow(
        'Failed to set value for key "key" in AsyncStorage',
      )
    })

    it('remove should propagate error when AsyncStorage removeItem rejects', async () => {
      mockAsyncStorage.removeItem.mockRejectedValueOnce(new Error('Permission denied'))

      const storage = createAsyncStorageProvider()

      await expect(storage.remove('key')).rejects.toThrow('Permission denied')
    })

    it('clear should propagate error when AsyncStorage clear rejects', async () => {
      mockAsyncStorage.clear.mockRejectedValueOnce(new Error('Clear failed'))

      const storage = createAsyncStorageProvider()

      await expect(storage.clear()).rejects.toThrow('Clear failed')
    })

    it('keys should propagate error when AsyncStorage getAllKeys rejects', async () => {
      mockAsyncStorage.getAllKeys.mockRejectedValueOnce(new Error('Keys error'))

      const storage = createAsyncStorageProvider()

      await expect(storage.keys()).rejects.toThrow('Keys error')
    })
  })

  // =================================================================
  // Type exports
  // =================================================================

  describe('type exports', () => {
    it('should export AsyncStorageConfig interface (compile-time check)', () => {
      const config: AsyncStorageConfig = {
        prefix: 'app_',
        serialize: JSON.stringify,
        deserialize: JSON.parse,
      }
      expect(config).toBeDefined()
    })

    it('should allow empty AsyncStorageConfig', () => {
      const config: AsyncStorageConfig = {}
      expect(config).toBeDefined()
    })
  })

  // =================================================================
  // Integration tests
  // =================================================================

  describe('integration tests', () => {
    it('should handle full lifecycle: set -> get -> update -> get -> remove -> get', async () => {
      const storage = createAsyncStorageProvider()

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

    it('should handle multiple providers with different prefixes', async () => {
      const provider1 = createAsyncStorageProvider({ prefix: 'app1_' })
      const provider2 = createAsyncStorageProvider({ prefix: 'app2_' })

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
      const storage = createAsyncStorageProvider({ prefix: 'batch_' })

      await storage.setMany([
        ['a', 1],
        ['b', 2],
        ['c', 3],
      ])

      const result = await storage.getMany<number>(['a', 'b', 'c'])

      expect(result.get('a')).toBe(1)
      expect(result.get('b')).toBe(2)
      expect(result.get('c')).toBe(3)

      await storage.removeMany(['a', 'c'])

      expect(await storage.get('a')).toBeNull()
      expect(await storage.get('b')).toBe(2)
      expect(await storage.get('c')).toBeNull()
    })

    it('should handle storing and retrieving complex nested objects', async () => {
      const storage = createAsyncStorageProvider()

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
      const storage = createAsyncStorageProvider()

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
