/**
 * Mock cache implementation for testing.
 *
 * @module
 */

import type { CacheOptions, CacheProvider } from '@molecule/api-cache'

/**
 * Creates a mock cache provider for testing.
 * @returns The created instance.
 */
export const createMockCache = (): CacheProvider & {
  store: Map<string, { value: unknown; tags?: string[] }>
  reset: () => void
} => {
  const store = new Map<string, { value: unknown; tags?: string[] }>()
  const tagIndex = new Map<string, Set<string>>()

  return {
    store,

    reset(): void {
      store.clear()
      tagIndex.clear()
    },

    async get<T = unknown>(key: string): Promise<T | undefined> {
      const entry = store.get(key)
      return entry?.value as T | undefined
    },

    async set<T = unknown>(key: string, value: T, options?: CacheOptions): Promise<void> {
      store.set(key, { value, tags: options?.tags })

      if (options?.tags) {
        for (const tag of options.tags) {
          if (!tagIndex.has(tag)) {
            tagIndex.set(tag, new Set())
          }
          tagIndex.get(tag)!.add(key)
        }
      }
    },

    async delete(key: string): Promise<boolean> {
      const existed = store.has(key)
      store.delete(key)
      return existed
    },

    async has(key: string): Promise<boolean> {
      return store.has(key)
    },

    async getMany<T = unknown>(keys: string[]): Promise<Map<string, T>> {
      const results = new Map<string, T>()
      for (const key of keys) {
        const entry = store.get(key)
        if (entry) {
          results.set(key, entry.value as T)
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
        if (store.delete(key)) count++
      }
      return count
    },

    async invalidateTag(tag: string): Promise<void> {
      const keys = tagIndex.get(tag)
      if (keys) {
        for (const key of keys) {
          store.delete(key)
        }
        tagIndex.delete(tag)
      }
    },

    async clear(): Promise<void> {
      store.clear()
      tagIndex.clear()
    },

    async close(): Promise<void> {},

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
 * Pre-configured mock cache for quick setup.
 */
export const mockCache = createMockCache()
