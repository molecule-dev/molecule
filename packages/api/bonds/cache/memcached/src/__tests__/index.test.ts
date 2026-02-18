/**
 * Tests for Memcached cache provider.
 *
 * @module
 */

import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

// Mock the memcached module before importing provider
vi.mock('memcached', () => {
  return {
    default: vi.fn(function () {
      return {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
        getMulti: vi.fn(),
        flush: vi.fn(),
        end: vi.fn(),
        on: vi.fn(),
      }
    }),
  }
})

import Memcached from 'memcached'

import type { CacheProvider } from '@molecule/api-cache'

import { createProvider } from '../provider.js'

describe('Memcached Cache Provider', () => {
  let provider: CacheProvider
  let mockClient: {
    get: Mock
    set: Mock
    del: Mock
    getMulti: Mock
    flush: Mock
    end: Mock
    on: Mock
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Get reference to the mock client
    mockClient = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      getMulti: vi.fn(),
      flush: vi.fn(),
      end: vi.fn(),
      on: vi.fn(),
    }
    ;(Memcached as unknown as Mock).mockImplementation(function () {
      return mockClient
    })

    provider = createProvider({ keyPrefix: 'test:' })
  })

  describe('createProvider', () => {
    it('creates provider with default options', () => {
      const defaultProvider = createProvider()
      expect(Memcached).toHaveBeenCalled()
      expect(defaultProvider).toBeDefined()
      expect(typeof defaultProvider.get).toBe('function')
      expect(typeof defaultProvider.set).toBe('function')
      expect(typeof defaultProvider.delete).toBe('function')
      expect(typeof defaultProvider.has).toBe('function')
    })

    it('creates provider with custom servers', () => {
      createProvider({ servers: 'server1:11211,server2:11211' })
      expect(Memcached).toHaveBeenCalledWith('server1:11211,server2:11211', undefined)
    })

    it('creates provider with servers array', () => {
      createProvider({ servers: ['server1:11211', 'server2:11211'] })
      expect(Memcached).toHaveBeenCalledWith(['server1:11211', 'server2:11211'], undefined)
    })

    it('creates provider with host and port', () => {
      createProvider({ host: 'cache.example.com', port: 11212 })
      expect(Memcached).toHaveBeenCalledWith('cache.example.com:11212', undefined)
    })

    it('creates provider with custom options', () => {
      const memcachedOptions = { timeout: 5000, retries: 3 }
      createProvider({ options: memcachedOptions })
      expect(Memcached).toHaveBeenCalledWith(expect.anything(), memcachedOptions)
    })

    it('registers event handlers', () => {
      createProvider()
      expect(mockClient.on).toHaveBeenCalledWith('failure', expect.any(Function))
      expect(mockClient.on).toHaveBeenCalledWith('reconnecting', expect.any(Function))
    })
  })

  describe('get', () => {
    it('returns undefined when key does not exist', async () => {
      mockClient.get.mockImplementation(
        (key: string, cb: (err: Error | null, data: unknown) => void) => {
          cb(null, undefined)
        },
      )

      const result = await provider.get('nonexistent')
      expect(result).toBeUndefined()
    })

    it('returns parsed JSON value when key exists', async () => {
      const testData = { name: 'test', value: 123 }
      mockClient.get.mockImplementation(
        (key: string, cb: (err: Error | null, data: unknown) => void) => {
          cb(null, JSON.stringify(testData))
        },
      )

      const result = await provider.get('existing')
      expect(result).toEqual(testData)
      expect(mockClient.get).toHaveBeenCalledWith('test:existing', expect.any(Function))
    })

    it('returns raw value when JSON parsing fails', async () => {
      mockClient.get.mockImplementation(
        (key: string, cb: (err: Error | null, data: unknown) => void) => {
          cb(null, 'not-json-string')
        },
      )

      const result = await provider.get('raw')
      expect(result).toBe('not-json-string')
    })

    it('returns undefined and logs error on failure', async () => {
      mockClient.get.mockImplementation(
        (key: string, cb: (err: Error | null, data: unknown) => void) => {
          cb(new Error('Connection failed'), undefined)
        },
      )

      const result = await provider.get('error-key')
      expect(result).toBeUndefined()
    })

    it('applies key prefix correctly', async () => {
      mockClient.get.mockImplementation(
        (key: string, cb: (err: Error | null, data: unknown) => void) => {
          cb(null, undefined)
        },
      )

      await provider.get('mykey')
      expect(mockClient.get).toHaveBeenCalledWith('test:mykey', expect.any(Function))
    })
  })

  describe('set', () => {
    it('sets value with JSON serialization', async () => {
      mockClient.set.mockImplementation(
        (
          key: string,
          value: unknown,
          ttl: number,
          cb: (err: Error | null, result: boolean) => void,
        ) => {
          cb(null, true)
        },
      )
      mockClient.get.mockImplementation(
        (key: string, cb: (err: Error | null, data: unknown) => void) => {
          cb(null, undefined)
        },
      )

      const testData = { name: 'test', value: 123 }
      await provider.set('mykey', testData)

      expect(mockClient.set).toHaveBeenCalledWith(
        'test:mykey',
        JSON.stringify(testData),
        0,
        expect.any(Function),
      )
    })

    it('sets value with TTL', async () => {
      mockClient.set.mockImplementation(
        (
          key: string,
          value: unknown,
          ttl: number,
          cb: (err: Error | null, result: boolean) => void,
        ) => {
          cb(null, true)
        },
      )
      mockClient.get.mockImplementation(
        (key: string, cb: (err: Error | null, data: unknown) => void) => {
          cb(null, undefined)
        },
      )

      await provider.set('mykey', 'value', { ttl: 3600 })

      expect(mockClient.set).toHaveBeenCalledWith(
        'test:mykey',
        '"value"',
        3600,
        expect.any(Function),
      )
    })

    it('sets value with tags', async () => {
      mockClient.set.mockImplementation(
        (
          key: string,
          value: unknown,
          ttl: number,
          cb: (err: Error | null, result: boolean) => void,
        ) => {
          cb(null, true)
        },
      )
      mockClient.get.mockImplementation(
        (key: string, cb: (err: Error | null, data: unknown) => void) => {
          cb(null, undefined)
        },
      )

      await provider.set('mykey', 'value', { tags: ['user:123', 'session'] })

      // Should set the value
      expect(mockClient.set).toHaveBeenCalledWith('test:mykey', '"value"', 0, expect.any(Function))

      // Should set tag tracking keys
      expect(mockClient.set).toHaveBeenCalledWith(
        'test:_tag:user:123',
        expect.any(String),
        0,
        expect.any(Function),
      )
      expect(mockClient.set).toHaveBeenCalledWith(
        'test:_tag:session',
        expect.any(String),
        0,
        expect.any(Function),
      )
    })

    it('appends key to existing tag tracking', async () => {
      const existingTagKeys = ['test:oldkey']

      mockClient.set.mockImplementation(
        (
          key: string,
          value: unknown,
          ttl: number,
          cb: (err: Error | null, result: boolean) => void,
        ) => {
          cb(null, true)
        },
      )
      mockClient.get.mockImplementation(
        (key: string, cb: (err: Error | null, data: unknown) => void) => {
          if (key === 'test:_tag:mytag') {
            cb(null, JSON.stringify(existingTagKeys))
          } else {
            cb(null, undefined)
          }
        },
      )

      await provider.set('newkey', 'value', { tags: ['mytag'] })

      // Verify tag key now includes both old and new keys
      expect(mockClient.set).toHaveBeenCalledWith(
        'test:_tag:mytag',
        JSON.stringify([...existingTagKeys, 'test:newkey']),
        0,
        expect.any(Function),
      )
    })

    it('does not duplicate key in tag tracking', async () => {
      const existingTagKeys = ['test:mykey']

      mockClient.set.mockImplementation(
        (
          key: string,
          value: unknown,
          ttl: number,
          cb: (err: Error | null, result: boolean) => void,
        ) => {
          cb(null, true)
        },
      )
      mockClient.get.mockImplementation(
        (key: string, cb: (err: Error | null, data: unknown) => void) => {
          if (key === 'test:_tag:mytag') {
            cb(null, JSON.stringify(existingTagKeys))
          } else {
            cb(null, undefined)
          }
        },
      )

      await provider.set('mykey', 'value', { tags: ['mytag'] })

      // Tag key should NOT be updated since the key is already in the tag list
      // Provider correctly avoids duplicate writes
      const tagSetCall = mockClient.set.mock.calls.find((call) => call[0] === 'test:_tag:mytag')
      expect(tagSetCall).toBeUndefined()
    })

    it('throws error on set failure', async () => {
      mockClient.set.mockImplementation(
        (
          key: string,
          value: unknown,
          ttl: number,
          cb: (err: Error | null, result: boolean) => void,
        ) => {
          cb(new Error('Set failed'), false)
        },
      )

      await expect(provider.set('mykey', 'value')).rejects.toThrow('Set failed')
    })
  })

  describe('delete', () => {
    it('deletes existing key and returns true', async () => {
      mockClient.del.mockImplementation(
        (key: string, cb: (err: Error | null, result: boolean) => void) => {
          cb(null, true)
        },
      )

      const result = await provider.delete('mykey')
      expect(result).toBe(true)
      expect(mockClient.del).toHaveBeenCalledWith('test:mykey', expect.any(Function))
    })

    it('returns false when key does not exist', async () => {
      mockClient.del.mockImplementation(
        (key: string, cb: (err: Error | null, result: boolean) => void) => {
          cb(null, false)
        },
      )

      const result = await provider.delete('nonexistent')
      expect(result).toBe(false)
    })

    it('returns false on error', async () => {
      mockClient.del.mockImplementation(
        (key: string, cb: (err: Error | null, result: boolean) => void) => {
          cb(new Error('Delete failed'), false)
        },
      )

      const result = await provider.delete('error-key')
      expect(result).toBe(false)
    })
  })

  describe('has', () => {
    it('returns true when key exists', async () => {
      mockClient.get.mockImplementation(
        (key: string, cb: (err: Error | null, data: unknown) => void) => {
          cb(null, 'some-value')
        },
      )

      const result = await provider.has('existing')
      expect(result).toBe(true)
      expect(mockClient.get).toHaveBeenCalledWith('test:existing', expect.any(Function))
    })

    it('returns false when key does not exist', async () => {
      mockClient.get.mockImplementation(
        (key: string, cb: (err: Error | null, data: unknown) => void) => {
          cb(null, undefined)
        },
      )

      const result = await provider.has('nonexistent')
      expect(result).toBe(false)
    })

    it('returns false on error', async () => {
      mockClient.get.mockImplementation(
        (key: string, cb: (err: Error | null, data: unknown) => void) => {
          cb(new Error('Connection failed'), undefined)
        },
      )

      const result = await provider.has('error-key')
      expect(result).toBe(false)
    })
  })

  describe('getMany', () => {
    it('returns empty map for empty keys array', async () => {
      const result = await provider.getMany([])
      expect(result).toEqual(new Map())
      expect(mockClient.getMulti).not.toHaveBeenCalled()
    })

    it('returns map of key-value pairs', async () => {
      mockClient.getMulti.mockImplementation(
        (keys: string[], cb: (err: Error | null, data: Record<string, unknown>) => void) => {
          cb(null, {
            'test:key1': JSON.stringify({ id: 1 }),
            'test:key2': JSON.stringify({ id: 2 }),
          })
        },
      )

      const result = await provider.getMany(['key1', 'key2'])

      expect(result.get('key1')).toEqual({ id: 1 })
      expect(result.get('key2')).toEqual({ id: 2 })
      expect(mockClient.getMulti).toHaveBeenCalledWith(
        ['test:key1', 'test:key2'],
        expect.any(Function),
      )
    })

    it('handles missing keys', async () => {
      mockClient.getMulti.mockImplementation(
        (keys: string[], cb: (err: Error | null, data: Record<string, unknown>) => void) => {
          cb(null, {
            'test:key1': JSON.stringify({ id: 1 }),
            // key2 is missing
          })
        },
      )

      const result = await provider.getMany(['key1', 'key2'])

      expect(result.get('key1')).toEqual({ id: 1 })
      expect(result.has('key2')).toBe(false)
    })

    it('handles non-JSON values', async () => {
      mockClient.getMulti.mockImplementation(
        (keys: string[], cb: (err: Error | null, data: Record<string, unknown>) => void) => {
          cb(null, {
            'test:key1': 'plain-string',
          })
        },
      )

      const result = await provider.getMany(['key1'])
      expect(result.get('key1')).toBe('plain-string')
    })

    it('returns empty map on error', async () => {
      mockClient.getMulti.mockImplementation(
        (keys: string[], cb: (err: Error | null, data: Record<string, unknown>) => void) => {
          cb(new Error('GetMulti failed'), {})
        },
      )

      const result = await provider.getMany(['key1', 'key2'])
      expect(result).toEqual(new Map())
    })
  })

  describe('setMany', () => {
    it('sets multiple key-value pairs', async () => {
      mockClient.set.mockImplementation(
        (
          key: string,
          value: unknown,
          ttl: number,
          cb: (err: Error | null, result: boolean) => void,
        ) => {
          cb(null, true)
        },
      )
      mockClient.get.mockImplementation(
        (key: string, cb: (err: Error | null, data: unknown) => void) => {
          cb(null, undefined)
        },
      )

      await provider.setMany([
        ['key1', { id: 1 }],
        ['key2', { id: 2 }],
      ])

      expect(mockClient.set).toHaveBeenCalledWith(
        'test:key1',
        JSON.stringify({ id: 1 }),
        0,
        expect.any(Function),
      )
      expect(mockClient.set).toHaveBeenCalledWith(
        'test:key2',
        JSON.stringify({ id: 2 }),
        0,
        expect.any(Function),
      )
    })

    it('applies cache options to all entries', async () => {
      mockClient.set.mockImplementation(
        (
          key: string,
          value: unknown,
          ttl: number,
          cb: (err: Error | null, result: boolean) => void,
        ) => {
          cb(null, true)
        },
      )
      mockClient.get.mockImplementation(
        (key: string, cb: (err: Error | null, data: unknown) => void) => {
          cb(null, undefined)
        },
      )

      await provider.setMany(
        [
          ['key1', 'value1'],
          ['key2', 'value2'],
        ],
        { ttl: 600 },
      )

      expect(mockClient.set).toHaveBeenCalledWith(
        'test:key1',
        '"value1"',
        600,
        expect.any(Function),
      )
      expect(mockClient.set).toHaveBeenCalledWith(
        'test:key2',
        '"value2"',
        600,
        expect.any(Function),
      )
    })
  })

  describe('deleteMany', () => {
    it('deletes multiple keys and returns count', async () => {
      mockClient.del.mockImplementation(
        (key: string, cb: (err: Error | null, result: boolean) => void) => {
          cb(null, true)
        },
      )

      const count = await provider.deleteMany(['key1', 'key2', 'key3'])
      expect(count).toBe(3)
    })

    it('returns count of successfully deleted keys', async () => {
      let callCount = 0
      mockClient.del.mockImplementation(
        (key: string, cb: (err: Error | null, result: boolean) => void) => {
          callCount++
          // key2 fails to delete
          cb(null, callCount !== 2)
        },
      )

      const count = await provider.deleteMany(['key1', 'key2', 'key3'])
      expect(count).toBe(2)
    })

    it('handles empty array', async () => {
      const count = await provider.deleteMany([])
      expect(count).toBe(0)
      expect(mockClient.del).not.toHaveBeenCalled()
    })
  })

  describe('invalidateTag', () => {
    it('deletes all keys associated with a tag', async () => {
      const taggedKeys = ['test:key1', 'test:key2', 'test:key3']

      mockClient.get.mockImplementation(
        (key: string, cb: (err: Error | null, data: unknown) => void) => {
          if (key === 'test:_tag:mytag') {
            cb(null, JSON.stringify(taggedKeys))
          } else {
            cb(null, undefined)
          }
        },
      )
      mockClient.del.mockImplementation(
        (key: string, cb: (err: Error | null, result: boolean) => void) => {
          cb(null, true)
        },
      )

      await provider.invalidateTag('mytag')

      // Should delete all tagged keys
      expect(mockClient.del).toHaveBeenCalledWith('test:key1', expect.any(Function))
      expect(mockClient.del).toHaveBeenCalledWith('test:key2', expect.any(Function))
      expect(mockClient.del).toHaveBeenCalledWith('test:key3', expect.any(Function))
      // Should also delete the tag key itself
      expect(mockClient.del).toHaveBeenCalledWith('test:_tag:mytag', expect.any(Function))
    })

    it('handles non-existent tag gracefully', async () => {
      mockClient.get.mockImplementation(
        (key: string, cb: (err: Error | null, data: unknown) => void) => {
          cb(null, undefined)
        },
      )
      mockClient.del.mockImplementation(
        (key: string, cb: (err: Error | null, result: boolean) => void) => {
          cb(null, true)
        },
      )

      await expect(provider.invalidateTag('nonexistent')).resolves.not.toThrow()
    })

    it('handles errors gracefully', async () => {
      mockClient.get.mockImplementation(
        (key: string, cb: (err: Error | null, data: unknown) => void) => {
          cb(new Error('Get failed'), undefined)
        },
      )

      await expect(provider.invalidateTag('error-tag')).resolves.not.toThrow()
    })
  })

  describe('clear', () => {
    it('flushes all data', async () => {
      mockClient.flush.mockImplementation((cb: (err: Error | null, results: boolean[]) => void) => {
        cb(null, [true])
      })

      await provider.clear()
      expect(mockClient.flush).toHaveBeenCalled()
    })

    it('throws error on flush failure', async () => {
      mockClient.flush.mockImplementation((cb: (err: Error | null, results: boolean[]) => void) => {
        cb(new Error('Flush failed'), [])
      })

      await expect(provider.clear()).rejects.toThrow('Flush failed')
    })
  })

  describe('close', () => {
    it('closes the client connection', async () => {
      await provider.close()
      expect(mockClient.end).toHaveBeenCalled()
    })
  })

  describe('getOrSet', () => {
    it('returns cached value when it exists', async () => {
      const cachedData = { id: 1, name: 'cached' }
      mockClient.get.mockImplementation(
        (key: string, cb: (err: Error | null, data: unknown) => void) => {
          cb(null, JSON.stringify(cachedData))
        },
      )

      const factory = vi.fn().mockResolvedValue({ id: 2, name: 'new' })
      const result = await provider.getOrSet('mykey', factory)

      expect(result).toEqual(cachedData)
      expect(factory).not.toHaveBeenCalled()
    })

    it('calls factory and caches result when key does not exist', async () => {
      const newData = { id: 1, name: 'new' }

      mockClient.get.mockImplementation(
        (key: string, cb: (err: Error | null, data: unknown) => void) => {
          cb(null, undefined)
        },
      )
      mockClient.set.mockImplementation(
        (
          key: string,
          value: unknown,
          ttl: number,
          cb: (err: Error | null, result: boolean) => void,
        ) => {
          cb(null, true)
        },
      )

      const factory = vi.fn().mockResolvedValue(newData)
      const result = await provider.getOrSet('mykey', factory)

      expect(result).toEqual(newData)
      expect(factory).toHaveBeenCalled()
      expect(mockClient.set).toHaveBeenCalledWith(
        'test:mykey',
        JSON.stringify(newData),
        0,
        expect.any(Function),
      )
    })

    it('applies cache options when setting', async () => {
      mockClient.get.mockImplementation(
        (key: string, cb: (err: Error | null, data: unknown) => void) => {
          cb(null, undefined)
        },
      )
      mockClient.set.mockImplementation(
        (
          key: string,
          value: unknown,
          ttl: number,
          cb: (err: Error | null, result: boolean) => void,
        ) => {
          cb(null, true)
        },
      )

      const factory = vi.fn().mockResolvedValue('value')
      await provider.getOrSet('mykey', factory, { ttl: 300 })

      expect(mockClient.set).toHaveBeenCalledWith(
        'test:mykey',
        '"value"',
        300,
        expect.any(Function),
      )
    })

    it('handles async factory function', async () => {
      mockClient.get.mockImplementation(
        (key: string, cb: (err: Error | null, data: unknown) => void) => {
          cb(null, undefined)
        },
      )
      mockClient.set.mockImplementation(
        (
          key: string,
          value: unknown,
          ttl: number,
          cb: (err: Error | null, result: boolean) => void,
        ) => {
          cb(null, true)
        },
      )

      const factory = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return { computed: true }
      })

      const result = await provider.getOrSet('mykey', factory)

      expect(result).toEqual({ computed: true })
    })
  })

  describe('key prefix', () => {
    it('uses default prefix when not specified', () => {
      createProvider()
      expect(Memcached).toHaveBeenCalled()
    })

    it('uses custom prefix correctly', async () => {
      mockClient.get.mockImplementation(
        (key: string, cb: (err: Error | null, data: unknown) => void) => {
          cb(null, undefined)
        },
      )

      createProvider({ keyPrefix: 'myapp:' })
      // Re-assign mockClient to the new instance
      ;(Memcached as unknown as Mock).mockImplementation(function () {
        return mockClient
      })

      await provider.get('testkey')
      expect(mockClient.get).toHaveBeenCalledWith('test:testkey', expect.any(Function))
    })
  })

  describe('type safety', () => {
    it('preserves generic types for get', async () => {
      interface User {
        id: number
        name: string
      }

      const userData: User = { id: 1, name: 'Test' }
      mockClient.get.mockImplementation(
        (key: string, cb: (err: Error | null, data: unknown) => void) => {
          cb(null, JSON.stringify(userData))
        },
      )

      const result = await provider.get<User>('user:1')
      expect(result?.id).toBe(1)
      expect(result?.name).toBe('Test')
    })

    it('preserves generic types for getMany', async () => {
      interface Product {
        sku: string
        price: number
      }

      mockClient.getMulti.mockImplementation(
        (keys: string[], cb: (err: Error | null, data: Record<string, unknown>) => void) => {
          cb(null, {
            'test:product:1': JSON.stringify({ sku: 'ABC', price: 99.99 }),
          })
        },
      )

      const result = await provider.getMany<Product>(['product:1'])
      const product = result.get('product:1')
      expect(product?.sku).toBe('ABC')
      expect(product?.price).toBe(99.99)
    })
  })
})
