/**
 * In-memory storage provider implementation.
 *
 * @module
 */

import type { StorageProvider } from './types.js'

/**
 * Creates an in-memory StorageProvider backed by a `Map`.
 *
 * Values are stored by reference (no serialization). Each call returns an
 * isolated instance with its own backing store.
 * @returns An isolated StorageProvider backed by an in-memory Map.
 */
export const createMemoryStorageProvider = (): StorageProvider => {
  const store = new Map<string, unknown>()

  return {
    async get<T = unknown>(key: string): Promise<T | null> {
      if (!store.has(key)) return null
      return store.get(key) as T
    },

    async set<T = unknown>(key: string, value: T): Promise<void> {
      store.set(key, value)
    },

    async remove(key: string): Promise<void> {
      store.delete(key)
    },

    async clear(): Promise<void> {
      store.clear()
    },

    async keys(): Promise<string[]> {
      return Array.from(store.keys())
    },

    async getMany<T = unknown>(keys: string[]): Promise<Map<string, T | null>> {
      const map = new Map<string, T | null>()
      for (const key of keys) {
        if (store.has(key)) {
          map.set(key, store.get(key) as T)
        } else {
          map.set(key, null)
        }
      }
      return map
    },

    async setMany<T = unknown>(entries: Array<[string, T]>): Promise<void> {
      for (const [key, value] of entries) {
        store.set(key, value)
      }
    },

    async removeMany(keys: string[]): Promise<void> {
      for (const key of keys) {
        store.delete(key)
      }
    },
  }
}
