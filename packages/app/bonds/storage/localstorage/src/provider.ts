/**
 * localStorage provider implementation.
 *
 * @module
 */

import { I18nError } from '@molecule/app-i18n'
import { getLogger } from '@molecule/app-logger'
import type { StorageProvider } from '@molecule/app-storage'

import type { LocalStorageConfig } from './types.js'

/**
 * Creates a localStorage-based storage provider that implements the molecule StorageProvider interface.
 *
 * @example
 * ```ts
 * import { createLocalStorageProvider } from '@molecule/app-storage-localstorage'
 * import { setProvider } from '@molecule/app-storage'
 *
 * const storage = createLocalStorageProvider({
 *   prefix: 'myapp_',
 * })
 *
 * setProvider(storage)
 *
 * // Store data
 * await storage.set('user', { name: 'John', email: 'john@example.com' })
 *
 * // Retrieve data
 * const user = await storage.get<{ name: string; email: string }>('user')
 * ```
 * @param config - Optional configuration for key prefix, serialization, and storage backend.
 * @returns A `StorageProvider` backed by `localStorage` with an in-memory fallback for SSR.
 */
export function createLocalStorageProvider(config: LocalStorageConfig = {}): StorageProvider {
  const logger = getLogger('storage')
  const {
    prefix = '',
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    storage = typeof window !== 'undefined' ? window.localStorage : undefined,
  } = config

  // Helper to get prefixed key
  const getKey = (key: string): string => `${prefix}${key}`

  // Helper to strip prefix from key
  const stripPrefix = (key: string): string => {
    if (prefix && key.startsWith(prefix)) {
      return key.slice(prefix.length)
    }
    return key
  }

  // Check if storage is available
  const isAvailable = (): boolean => {
    if (!storage) return false

    try {
      const testKey = '__storage_test__'
      storage.setItem(testKey, testKey)
      storage.removeItem(testKey)
      return true
    } catch (error) {
      logger.warn('localStorage is not available', { error })
      return false
    }
  }

  // In-memory fallback for SSR or unavailable localStorage
  const memoryStorage = new Map<string, string>()

  const getStorage = (): {
    getItem(key: string): string | null
    setItem(key: string, value: string): void
    removeItem(key: string): void
    clear(): void
    key(index: number): string | null
    length: number
  } => {
    if (isAvailable() && storage) {
      return storage
    }

    // Return in-memory fallback
    return {
      getItem: (key: string) => memoryStorage.get(key) ?? null,
      setItem: (key: string, value: string) => memoryStorage.set(key, value),
      removeItem: (key: string) => memoryStorage.delete(key),
      clear: () => memoryStorage.clear(),
      key: (index: number) => Array.from(memoryStorage.keys())[index] ?? null,
      get length() {
        return memoryStorage.size
      },
    }
  }

  const provider: StorageProvider = {
    async get<T = unknown>(key: string): Promise<T | null> {
      try {
        const store = getStorage()
        const value = store.getItem(getKey(key))

        if (value === null) {
          return null
        }

        return deserialize(value) as T
      } catch (err) {
        logger.warn('Failed to deserialize stored value', key, err)
        return null
      }
    },

    getSync<T = unknown>(key: string): T | null {
      try {
        const value = getStorage().getItem(getKey(key))

        if (value === null) {
          return null
        }

        return deserialize(value) as T
      } catch (err) {
        logger.warn('Failed to deserialize stored value', key, err)
        return null
      }
    },

    async set<T = unknown>(key: string, value: T): Promise<void> {
      try {
        const store = getStorage()
        const serialized = serialize(value)
        store.setItem(getKey(key), serialized)
      } catch (error) {
        // Handle quota exceeded errors
        if (error instanceof Error && error.name === 'QuotaExceededError') {
          logger.warn('Storage quota exceeded', key)
          throw new I18nError(
            'storage.error.quotaExceeded',
            { key },
            `Storage quota exceeded when setting key "${key}"`,
            error,
          )
        }
        throw error
      }
    },

    async remove(key: string): Promise<void> {
      const store = getStorage()
      store.removeItem(getKey(key))
    },

    subscribe(key: string, listener: (value: unknown) => void): () => void {
      // Only a real browser can report another tab's write, and only through
      // the `storage` event (it never fires in the tab that made the change).
      if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
        return () => {}
      }

      const prefixedKey = getKey(key)
      const onStorage = (event: StorageEvent): void => {
        // A different backend (sessionStorage) writing the same key is not our
        // change. `storageArea` is absent on a synthetic event — nothing to compare.
        if (event.storageArea && storage && event.storageArea !== storage) return
        // `key === null` is another tab's `clear()`, which removed every key.
        if (event.key !== null && event.key !== prefixedKey) return
        if (event.newValue === null) {
          listener(null)
          return
        }
        try {
          listener(deserialize(event.newValue))
        } catch (err) {
          // Another tab wrote a value this provider cannot read: it is absent
          // for us, the same contract as `get()`.
          logger.warn('Failed to deserialize stored value', key, err)
          listener(null)
        }
      }

      window.addEventListener('storage', onStorage)
      return () => window.removeEventListener('storage', onStorage)
    },

    async clear(): Promise<void> {
      const store = getStorage()

      if (prefix) {
        // Only clear prefixed keys
        const keysToRemove: string[] = []
        for (let i = 0; i < store.length; i++) {
          const key = store.key(i)
          if (key && key.startsWith(prefix)) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach((key) => store.removeItem(key))
      } else {
        store.clear()
      }
    },

    async keys(): Promise<string[]> {
      const store = getStorage()
      const result: string[] = []

      for (let i = 0; i < store.length; i++) {
        const key = store.key(i)
        if (key) {
          if (prefix) {
            if (key.startsWith(prefix)) {
              result.push(stripPrefix(key))
            }
          } else {
            result.push(key)
          }
        }
      }

      return result
    },

    async getMany<T = unknown>(keys: string[]): Promise<Map<string, T | null>> {
      const result = new Map<string, T | null>()

      for (const key of keys) {
        const value = await provider.get<T>(key)
        result.set(key, value)
      }

      return result
    },

    async setMany<T = unknown>(entries: Array<[string, T]>): Promise<void> {
      for (const [key, value] of entries) {
        await provider.set(key, value)
      }
    },

    async removeMany(keys: string[]): Promise<void> {
      for (const key of keys) {
        await provider.remove(key)
      }
    },
  }

  return provider
}

/**
 * Creates a `sessionStorage`-based provider using the same implementation as `createLocalStorageProvider`
 * but backed by `window.sessionStorage` (data cleared when the browser tab closes).
 *
 * @example
 * ```ts
 * import { createSessionStorageProvider } from '@molecule/app-storage-localstorage'
 *
 * const storage = createSessionStorageProvider()
 * ```
 *
 * @param config - Optional configuration for key prefix and serialization.
 * @returns A `StorageProvider` backed by `sessionStorage`.
 */
export function createSessionStorageProvider(
  config: Omit<LocalStorageConfig, 'storage'> = {},
): StorageProvider {
  return createLocalStorageProvider({
    ...config,
    storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
  })
}

/** Default `localStorage` provider created with no prefix and JSON serialization. */
export const provider = createLocalStorageProvider()

/**
 * Session storage provider.
 */
export const sessionProvider = createSessionStorageProvider()
