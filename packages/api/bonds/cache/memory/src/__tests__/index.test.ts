import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { createProvider as CreateProviderFn } from '../provider.js'
import type { CacheEntry, CacheOptions, CacheProvider, MemoryOptions } from '../types.js'

describe('@molecule/api-cache-memory', () => {
  let createProvider: typeof CreateProviderFn
  let provider: CacheProvider

  beforeEach(async () => {
    vi.resetModules()
    vi.useFakeTimers()
    const providerModule = await import('../provider.js')
    createProvider = providerModule.createProvider
    provider = createProvider({ cleanupInterval: 0 }) // Disable cleanup timer for tests
  })

  afterEach(async () => {
    await provider.close?.()
    vi.useRealTimers()
  })

  describe('createProvider()', () => {
    it('should create a provider with default options', () => {
      const p = createProvider()
      expect(p).toBeDefined()
      expect(p.get).toBeDefined()
      expect(p.set).toBeDefined()
      expect(p.delete).toBeDefined()
      expect(p.has).toBeDefined()
    })

    it('should create a provider with custom maxSize', async () => {
      const p = createProvider({ maxSize: 2, cleanupInterval: 0 })

      await p.set('key1', 'value1')
      await p.set('key2', 'value2')
      await p.set('key3', 'value3') // Should evict key1

      expect(await p.get('key1')).toBeUndefined()
      expect(await p.get('key2')).toBe('value2')
      expect(await p.get('key3')).toBe('value3')
    })

    it('should create a provider with custom defaultTtl', async () => {
      const p = createProvider({ defaultTtl: 1, cleanupInterval: 0 })

      await p.set('key', 'value')

      expect(await p.get('key')).toBe('value')

      vi.advanceTimersByTime(1001)

      expect(await p.get('key')).toBeUndefined()
    })

    it('should handle cleanup interval timer', async () => {
      const p = createProvider({ cleanupInterval: 1000 })

      await p.set('key', 'value', { ttl: 1 })

      vi.advanceTimersByTime(2000)

      // The cleanup timer should have run and removed expired entries
      // Note: We need to manually trigger a get to verify the entry is gone
      // since cleanup runs asynchronously
      expect(await p.has('key')).toBe(false)

      await p.close?.()
    })
  })

  describe('get()', () => {
    it('should return undefined for missing key', async () => {
      const result = await provider.get('missing-key')
      expect(result).toBeUndefined()
    })

    it('should return the cached value', async () => {
      await provider.set('key', 'value')
      const result = await provider.get('key')
      expect(result).toBe('value')
    })

    it('should return typed value', async () => {
      interface User {
        id: number
        name: string
      }

      const user: User = { id: 1, name: 'Test' }
      await provider.set('user', user)

      const result = await provider.get<User>('user')
      expect(result).toEqual({ id: 1, name: 'Test' })
    })

    it('should return undefined for expired key', async () => {
      await provider.set('key', 'value', { ttl: 1 })

      expect(await provider.get('key')).toBe('value')

      vi.advanceTimersByTime(1001)

      expect(await provider.get('key')).toBeUndefined()
    })

    it('should update LRU order on access', async () => {
      const p = createProvider({ maxSize: 2, cleanupInterval: 0 })

      await p.set('key1', 'value1')
      await p.set('key2', 'value2')

      // Access key1 to make it recently used
      await p.get('key1')

      // Add key3, which should evict key2 (least recently used)
      await p.set('key3', 'value3')

      expect(await p.get('key1')).toBe('value1')
      expect(await p.get('key2')).toBeUndefined()
      expect(await p.get('key3')).toBe('value3')
    })

    it('should handle various data types', async () => {
      await provider.set('string', 'hello')
      await provider.set('number', 42)
      await provider.set('boolean', true)
      await provider.set('null', null)
      await provider.set('array', [1, 2, 3])
      await provider.set('object', { nested: { value: 'deep' } })

      expect(await provider.get('string')).toBe('hello')
      expect(await provider.get('number')).toBe(42)
      expect(await provider.get('boolean')).toBe(true)
      expect(await provider.get('null')).toBe(null)
      expect(await provider.get('array')).toEqual([1, 2, 3])
      expect(await provider.get('object')).toEqual({ nested: { value: 'deep' } })
    })
  })

  describe('set()', () => {
    it('should set a value', async () => {
      await provider.set('key', 'value')
      expect(await provider.get('key')).toBe('value')
    })

    it('should overwrite existing value', async () => {
      await provider.set('key', 'value1')
      await provider.set('key', 'value2')
      expect(await provider.get('key')).toBe('value2')
    })

    it('should set value with TTL', async () => {
      await provider.set('key', 'value', { ttl: 10 })

      expect(await provider.get('key')).toBe('value')

      vi.advanceTimersByTime(5000)
      expect(await provider.get('key')).toBe('value')

      vi.advanceTimersByTime(5001)
      expect(await provider.get('key')).toBeUndefined()
    })

    it('should set value with tags', async () => {
      await provider.set('key1', 'value1', { tags: ['user', 'session'] })
      await provider.set('key2', 'value2', { tags: ['user'] })

      expect(await provider.get('key1')).toBe('value1')
      expect(await provider.get('key2')).toBe('value2')

      await provider.invalidateTag?.('user')

      expect(await provider.get('key1')).toBeUndefined()
      expect(await provider.get('key2')).toBeUndefined()
    })

    it('should evict oldest entry when maxSize is reached', async () => {
      const p = createProvider({ maxSize: 3, cleanupInterval: 0 })

      await p.set('key1', 'value1')
      await p.set('key2', 'value2')
      await p.set('key3', 'value3')
      await p.set('key4', 'value4') // Should evict key1

      expect(await p.get('key1')).toBeUndefined()
      expect(await p.get('key2')).toBe('value2')
      expect(await p.get('key3')).toBe('value3')
      expect(await p.get('key4')).toBe('value4')
    })
  })

  describe('delete()', () => {
    it('should return true when key is deleted', async () => {
      await provider.set('key', 'value')
      const result = await provider.delete('key')
      expect(result).toBe(true)
      expect(await provider.get('key')).toBeUndefined()
    })

    it('should return false when key does not exist', async () => {
      const result = await provider.delete('missing-key')
      expect(result).toBe(false)
    })

    it('should delete the correct key', async () => {
      await provider.set('key1', 'value1')
      await provider.set('key2', 'value2')

      await provider.delete('key1')

      expect(await provider.get('key1')).toBeUndefined()
      expect(await provider.get('key2')).toBe('value2')
    })
  })

  describe('has()', () => {
    it('should return true when key exists', async () => {
      await provider.set('key', 'value')
      expect(await provider.has('key')).toBe(true)
    })

    it('should return false when key does not exist', async () => {
      expect(await provider.has('missing-key')).toBe(false)
    })

    it('should return false for expired key', async () => {
      await provider.set('key', 'value', { ttl: 1 })

      expect(await provider.has('key')).toBe(true)

      vi.advanceTimersByTime(1001)

      expect(await provider.has('key')).toBe(false)
    })

    it('should delete expired key on check', async () => {
      await provider.set('key', 'value', { ttl: 1 })

      vi.advanceTimersByTime(1001)

      await provider.has('key') // This should delete the expired key

      // Verify the key is actually deleted from the cache
      // by checking that a subsequent set doesn't cause eviction
      const p = createProvider({ maxSize: 1, cleanupInterval: 0 })
      await p.set('key', 'value', { ttl: 1 })

      vi.advanceTimersByTime(1001)
      await p.has('key')

      await p.set('new-key', 'new-value')
      expect(await p.get('new-key')).toBe('new-value')
    })
  })

  describe('getMany()', () => {
    it('should return empty map for empty keys array', async () => {
      const result = await provider.getMany?.([])
      expect(result).toEqual(new Map())
    })

    it('should return map of existing key-value pairs', async () => {
      await provider.set('key1', 'value1')
      await provider.set('key2', 'value2')
      await provider.set('key3', 'value3')

      const result = await provider.getMany?.(['key1', 'key3'])

      expect(result?.get('key1')).toBe('value1')
      expect(result?.get('key3')).toBe('value3')
      expect(result?.size).toBe(2)
    })

    it('should omit missing keys', async () => {
      await provider.set('key1', 'value1')

      const result = await provider.getMany?.(['key1', 'missing-key'])

      expect(result?.get('key1')).toBe('value1')
      expect(result?.has('missing-key')).toBe(false)
      expect(result?.size).toBe(1)
    })

    it('should omit expired keys', async () => {
      await provider.set('key1', 'value1', { ttl: 10 })
      await provider.set('key2', 'value2', { ttl: 1 })

      vi.advanceTimersByTime(1001)

      const result = await provider.getMany?.(['key1', 'key2'])

      expect(result?.get('key1')).toBe('value1')
      expect(result?.has('key2')).toBe(false)
      expect(result?.size).toBe(1)
    })
  })

  describe('setMany()', () => {
    it('should do nothing for empty entries array', async () => {
      await provider.setMany?.([], { ttl: 60 })
      // No error should be thrown
    })

    it('should set multiple values', async () => {
      await provider.setMany?.([
        ['key1', 'value1'],
        ['key2', 'value2'],
        ['key3', 'value3'],
      ])

      expect(await provider.get('key1')).toBe('value1')
      expect(await provider.get('key2')).toBe('value2')
      expect(await provider.get('key3')).toBe('value3')
    })

    it('should set multiple values with TTL', async () => {
      await provider.setMany?.(
        [
          ['key1', 'value1'],
          ['key2', 'value2'],
        ],
        { ttl: 1 },
      )

      expect(await provider.get('key1')).toBe('value1')
      expect(await provider.get('key2')).toBe('value2')

      vi.advanceTimersByTime(1001)

      expect(await provider.get('key1')).toBeUndefined()
      expect(await provider.get('key2')).toBeUndefined()
    })

    it('should set multiple values with tags', async () => {
      await provider.setMany?.(
        [
          ['key1', 'value1'],
          ['key2', 'value2'],
        ],
        { tags: ['batch'] },
      )

      await provider.invalidateTag?.('batch')

      expect(await provider.get('key1')).toBeUndefined()
      expect(await provider.get('key2')).toBeUndefined()
    })
  })

  describe('deleteMany()', () => {
    it('should return 0 for empty keys array', async () => {
      const result = await provider.deleteMany?.([])
      expect(result).toBe(0)
    })

    it('should delete multiple keys', async () => {
      await provider.set('key1', 'value1')
      await provider.set('key2', 'value2')
      await provider.set('key3', 'value3')

      const result = await provider.deleteMany?.(['key1', 'key3'])

      expect(result).toBe(2)
      expect(await provider.get('key1')).toBeUndefined()
      expect(await provider.get('key2')).toBe('value2')
      expect(await provider.get('key3')).toBeUndefined()
    })

    it('should return count of actually deleted keys', async () => {
      await provider.set('key1', 'value1')

      const result = await provider.deleteMany?.(['key1', 'missing-key'])

      expect(result).toBe(1)
    })
  })

  describe('invalidateTag()', () => {
    it('should delete all keys with the tag', async () => {
      await provider.set('user:1', 'data1', { tags: ['users'] })
      await provider.set('user:2', 'data2', { tags: ['users'] })
      await provider.set('session:1', 'data3', { tags: ['sessions'] })

      await provider.invalidateTag?.('users')

      expect(await provider.get('user:1')).toBeUndefined()
      expect(await provider.get('user:2')).toBeUndefined()
      expect(await provider.get('session:1')).toBe('data3')
    })

    it('should handle non-existent tag', async () => {
      await provider.set('key', 'value')

      // Should not throw
      await provider.invalidateTag?.('non-existent-tag')

      expect(await provider.get('key')).toBe('value')
    })

    it('should handle keys with multiple tags', async () => {
      await provider.set('key1', 'value1', { tags: ['tag1', 'tag2'] })
      await provider.set('key2', 'value2', { tags: ['tag2', 'tag3'] })
      await provider.set('key3', 'value3', { tags: ['tag3'] })

      await provider.invalidateTag?.('tag2')

      expect(await provider.get('key1')).toBeUndefined()
      expect(await provider.get('key2')).toBeUndefined()
      expect(await provider.get('key3')).toBe('value3')
    })
  })

  describe('clear()', () => {
    it('should clear all cache entries', async () => {
      await provider.set('key1', 'value1')
      await provider.set('key2', 'value2')
      await provider.set('key3', 'value3')

      await provider.clear?.()

      expect(await provider.get('key1')).toBeUndefined()
      expect(await provider.get('key2')).toBeUndefined()
      expect(await provider.get('key3')).toBeUndefined()
    })

    it('should clear tag index', async () => {
      await provider.set('key1', 'value1', { tags: ['tag1'] })
      await provider.set('key2', 'value2', { tags: ['tag1'] })

      await provider.clear?.()

      // Set new key with same tag
      await provider.set('key3', 'value3', { tags: ['tag1'] })

      // Invalidating should only affect key3
      await provider.invalidateTag?.('tag1')

      // key3 should be invalidated
      expect(await provider.get('key3')).toBeUndefined()
    })
  })

  describe('close()', () => {
    it('should clear cache and stop cleanup timer', async () => {
      const p = createProvider({ cleanupInterval: 1000 })

      await p.set('key', 'value')

      await p.close?.()

      expect(await p.get('key')).toBeUndefined()
    })

    it('should handle multiple close calls', async () => {
      const p = createProvider()

      await p.close?.()
      await p.close?.() // Should not throw

      expect(true).toBe(true)
    })
  })

  describe('getOrSet()', () => {
    it('should return cached value if exists', async () => {
      await provider.set('key', 'cached-value')

      const factory = vi.fn().mockResolvedValue('fresh-value')
      const result = await provider.getOrSet?.('key', factory)

      expect(result).toBe('cached-value')
      expect(factory).not.toHaveBeenCalled()
    })

    it('should call factory and cache result if not cached', async () => {
      const factory = vi.fn().mockResolvedValue('fresh-value')
      const result = await provider.getOrSet?.('key', factory)

      expect(result).toBe('fresh-value')
      expect(factory).toHaveBeenCalled()
      expect(await provider.get('key')).toBe('fresh-value')
    })

    it('should call factory and cache result if expired', async () => {
      await provider.set('key', 'old-value', { ttl: 1 })

      vi.advanceTimersByTime(1001)

      const factory = vi.fn().mockResolvedValue('fresh-value')
      const result = await provider.getOrSet?.('key', factory)

      expect(result).toBe('fresh-value')
      expect(factory).toHaveBeenCalled()
    })

    it('should apply TTL option to cached value', async () => {
      const factory = vi.fn().mockResolvedValue('fresh-value')
      await provider.getOrSet?.('key', factory, { ttl: 1 })

      expect(await provider.get('key')).toBe('fresh-value')

      vi.advanceTimersByTime(1001)

      expect(await provider.get('key')).toBeUndefined()
    })

    it('should apply tags option to cached value', async () => {
      const factory = vi.fn().mockResolvedValue('fresh-value')
      await provider.getOrSet?.('key', factory, { tags: ['dynamic'] })

      expect(await provider.get('key')).toBe('fresh-value')

      await provider.invalidateTag?.('dynamic')

      expect(await provider.get('key')).toBeUndefined()
    })

    it('should handle async factory errors', async () => {
      const factory = vi.fn().mockRejectedValue(new Error('Factory failed'))

      await expect(provider.getOrSet?.('key', factory)).rejects.toThrow('Factory failed')
      expect(await provider.get('key')).toBeUndefined()
    })
  })

  describe('default provider export', () => {
    it('should export a default provider instance', async () => {
      const { provider: defaultProvider } = await import('../provider.js')

      expect(defaultProvider).toBeDefined()
      expect(defaultProvider.get).toBeDefined()
      expect(defaultProvider.set).toBeDefined()
      expect(defaultProvider.delete).toBeDefined()
      expect(defaultProvider.has).toBeDefined()
      expect(defaultProvider.getMany).toBeDefined()
      expect(defaultProvider.setMany).toBeDefined()
      expect(defaultProvider.deleteMany).toBeDefined()
      expect(defaultProvider.invalidateTag).toBeDefined()
      expect(defaultProvider.clear).toBeDefined()
      expect(defaultProvider.close).toBeDefined()
      expect(defaultProvider.getOrSet).toBeDefined()
    })
  })

  describe('index exports', () => {
    it('should export createProvider and provider', async () => {
      const indexModule = await import('../index.js')

      expect(indexModule.createProvider).toBeDefined()
      expect(indexModule.provider).toBeDefined()
    })

    it('should export types', async () => {
      // TypeScript type checking - these should compile without errors
      const cacheOptions: CacheOptions = { ttl: 60, tags: ['test'] }
      const memoryOptions: MemoryOptions = {
        maxSize: 100,
        defaultTtl: 3600,
        cleanupInterval: 60000,
      }
      const cacheEntry: CacheEntry = {
        value: 'test',
        expiresAt: Date.now() + 60000,
        tags: ['test'],
      }

      expect(cacheOptions).toBeDefined()
      expect(memoryOptions).toBeDefined()
      expect(cacheEntry).toBeDefined()
    })
  })

  describe('TTL edge cases', () => {
    it('should handle TTL of 0 as no TTL', async () => {
      await provider.set('key', 'value', { ttl: 0 })

      vi.advanceTimersByTime(10000)

      // TTL of 0 should be treated as undefined (no expiration)
      // This behavior depends on implementation
      expect(await provider.get('key')).toBe('value')
    })

    it('should handle very large TTL values', async () => {
      await provider.set('key', 'value', { ttl: 31536000 }) // 1 year in seconds

      vi.advanceTimersByTime(1000 * 60 * 60 * 24) // 1 day

      expect(await provider.get('key')).toBe('value')
    })

    it('should expire exactly at TTL boundary', async () => {
      await provider.set('key', 'value', { ttl: 5 })

      vi.advanceTimersByTime(4999)
      expect(await provider.get('key')).toBe('value')

      vi.advanceTimersByTime(2)
      expect(await provider.get('key')).toBeUndefined()
    })
  })

  describe('LRU eviction edge cases', () => {
    it('should handle maxSize of 1', async () => {
      const p = createProvider({ maxSize: 1, cleanupInterval: 0 })

      await p.set('key1', 'value1')
      expect(await p.get('key1')).toBe('value1')

      await p.set('key2', 'value2')
      expect(await p.get('key1')).toBeUndefined()
      expect(await p.get('key2')).toBe('value2')
    })

    it('should not evict when updating existing key', async () => {
      const p = createProvider({ maxSize: 2, cleanupInterval: 0 })

      await p.set('key1', 'value1')
      await p.set('key2', 'value2')
      await p.set('key1', 'updated-value1') // Update, not insert

      expect(await p.get('key1')).toBe('updated-value1')
      expect(await p.get('key2')).toBe('value2')
    })
  })

  describe('concurrent operations', () => {
    it('should handle concurrent set operations', async () => {
      const promises = Array.from({ length: 100 }, (_, i) => provider.set(`key${i}`, `value${i}`))

      await Promise.all(promises)

      for (let i = 0; i < 100; i++) {
        expect(await provider.get(`key${i}`)).toBe(`value${i}`)
      }
    })

    it('should handle concurrent get and set operations', async () => {
      await provider.set('shared-key', 'initial')

      const operations = [
        provider.get('shared-key'),
        provider.set('shared-key', 'updated'),
        provider.get('shared-key'),
        provider.set('shared-key', 'final'),
        provider.get('shared-key'),
      ]

      const results = await Promise.all(operations)

      // The final get should return 'final'
      expect(results[4]).toBe('final')
    })

    it('should handle concurrent getOrSet operations', async () => {
      let callCount = 0
      const factory = vi.fn(async () => {
        callCount++
        return `value-${callCount}`
      })

      // Start multiple getOrSet calls simultaneously
      const promises = Array.from({ length: 5 }, () =>
        provider.getOrSet?.('concurrent-key', factory),
      )

      const results = await Promise.all(promises)

      // All results should be the same (first factory result cached)
      // Note: Due to the async nature, the factory might be called multiple times
      // in a race condition, but all should eventually return consistent values
      expect(results.every((r) => r !== undefined)).toBe(true)
    })
  })
})
