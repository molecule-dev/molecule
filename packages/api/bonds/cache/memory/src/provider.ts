/**
 * In-memory cache provider implementation.
 *
 * A simple, zero-dependency cache provider for development and testing.
 * Not suitable for production multi-instance deployments.
 *
 * @module
 */

import type { CacheOptions, CacheProvider } from '@molecule/api-cache'

import type { CacheEntry, MemoryOptions } from './types.js'

/**
 * Creates an in-memory cache provider with LRU eviction, TTL expiration,
 * and tag-based invalidation. Suitable for development and single-instance
 * deployments — not recommended for multi-instance production.
 *
 * @param options - Memory cache options (max size, default TTL, cleanup interval).
 * @returns A `CacheProvider` backed by an in-memory `Map`.
 */
export const createProvider = (options?: MemoryOptions): CacheProvider => {
  const cache = new Map<string, CacheEntry>()
  const tagIndex = new Map<string, Set<string>>()
  const maxSize = options?.maxSize ?? 1000
  const defaultTtl = options?.defaultTtl
  const cleanupInterval = options?.cleanupInterval ?? 60000

  // Cleanup expired entries periodically
  let cleanupTimer: ReturnType<typeof setInterval> | null = null
  if (cleanupInterval > 0) {
    cleanupTimer = setInterval(() => {
      const now = Date.now()
      for (const [key, entry] of cache.entries()) {
        if (entry.expiresAt && entry.expiresAt <= now) {
          cache.delete(key)
        }
      }
    }, cleanupInterval)
    cleanupTimer.unref?.()
  }

  const isExpired = (entry: CacheEntry): boolean => {
    return entry.expiresAt !== undefined && entry.expiresAt <= Date.now()
  }

  const evictIfNeeded = (): void => {
    if (cache.size >= maxSize) {
      // Simple LRU: delete the first (oldest) entry
      const firstKey = cache.keys().next().value
      if (firstKey) {
        cache.delete(firstKey)
      }
    }
  }

  const addToTagIndex = (key: string, tags?: string[]): void => {
    if (!tags) return
    for (const tag of tags) {
      let keys = tagIndex.get(tag)
      if (!keys) {
        keys = new Set()
        tagIndex.set(tag, keys)
      }
      keys.add(key)
    }
  }

  return {
    async get<T = unknown>(key: string): Promise<T | undefined> {
      const entry = cache.get(key)
      if (!entry) return undefined
      if (isExpired(entry)) {
        cache.delete(key)
        return undefined
      }
      // Move to end for LRU
      cache.delete(key)
      cache.set(key, entry)
      return entry.value as T
    },

    async set<T = unknown>(key: string, value: T, options?: CacheOptions): Promise<void> {
      evictIfNeeded()
      const ttl = options?.ttl ?? defaultTtl
      const entry: CacheEntry<T> = {
        value,
        expiresAt: ttl ? Date.now() + ttl * 1000 : undefined,
        tags: options?.tags,
      }
      cache.set(key, entry)
      addToTagIndex(key, options?.tags)
    },

    async delete(key: string): Promise<boolean> {
      return cache.delete(key)
    },

    async has(key: string): Promise<boolean> {
      const entry = cache.get(key)
      if (!entry) return false
      if (isExpired(entry)) {
        cache.delete(key)
        return false
      }
      return true
    },

    async getMany<T = unknown>(keys: string[]): Promise<Map<string, T>> {
      const results = new Map<string, T>()
      for (const key of keys) {
        const value = await this.get<T>(key)
        if (value !== undefined) {
          results.set(key, value)
        }
      }
      return results
    },

    async setMany<T = unknown>(entries: Array<[string, T]>, options?: CacheOptions): Promise<void> {
      for (const [key, value] of entries) {
        await this.set(key, value, options)
      }
    },

    async deleteMany(keys: string[]): Promise<number> {
      let count = 0
      for (const key of keys) {
        if (cache.delete(key)) count++
      }
      return count
    },

    async invalidateTag(tag: string): Promise<void> {
      const keys = tagIndex.get(tag)
      if (keys) {
        for (const key of keys) {
          cache.delete(key)
        }
        tagIndex.delete(tag)
      }
    },

    async clear(): Promise<void> {
      cache.clear()
      tagIndex.clear()
    },

    async close(): Promise<void> {
      if (cleanupTimer) {
        clearInterval(cleanupTimer)
        cleanupTimer = null
      }
      cache.clear()
      tagIndex.clear()
    },

    async getOrSet<T = unknown>(
      key: string,
      factory: () => Promise<T>,
      options?: CacheOptions,
    ): Promise<T> {
      const cached = await this.get<T>(key)
      if (cached !== undefined) return cached

      const value = await factory()
      await this.set(key, value, options)
      return value
    },
  }
}

/**
 * The default in-memory provider instance.
 */
let _provider: CacheProvider | null = null
/**
 * The provider implementation.
 */
export const provider: CacheProvider = new Proxy({} as CacheProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
})
