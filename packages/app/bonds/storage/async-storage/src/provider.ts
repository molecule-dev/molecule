/**
 * AsyncStorage provider implementation for React Native.
 *
 * @module
 */

import { t } from '@molecule/app-i18n'
import { getLogger } from '@molecule/app-logger'
import type { StorageProvider } from '@molecule/app-storage'

import type { AsyncStorageConfig } from './types.js'

/** Minimal interface matching `@react-native-async-storage/async-storage`'s API surface. */
interface AsyncStorageAPI {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
  getAllKeys(): Promise<readonly string[]>
  multiGet(keys: readonly string[]): Promise<readonly [string, string | null][]>
  multiSet(pairs: readonly [string, string][]): Promise<void>
  multiRemove(keys: readonly string[]): Promise<void>
  clear(): Promise<void>
}

const ASYNC_STORAGE_PACKAGE = '@react-native-async-storage/async-storage'

/**
 * Lazily resolved AsyncStorage instance.
 * Uses dynamic import to avoid hard compile-time dependency on the React Native runtime.
 */
let resolvedAsyncStorage: AsyncStorageAPI | undefined

/** Checks the methods the storage provider delegates to. */
function isAsyncStorage(value: unknown): value is AsyncStorageAPI {
  if (!value || typeof value !== 'object') return false
  const methods: ReadonlyArray<keyof AsyncStorageAPI> = [
    'getItem',
    'setItem',
    'removeItem',
    'getAllKeys',
    'multiGet',
    'multiSet',
    'multiRemove',
    'clear',
  ]
  return methods.every(
    (method) => Reflect.has(value, method) && typeof Reflect.get(value, method) === 'function',
  )
}

/** Handles ESM, CommonJS and Babel's nested default interop. */
function resolveAsyncStorage(value: unknown): AsyncStorageAPI | undefined {
  if (value && typeof value === 'object' && 'default' in value) {
    if (isAsyncStorage(value.default)) return value.default
    const nested = value.default
    if (
      nested &&
      typeof nested === 'object' &&
      'default' in nested &&
      isAsyncStorage(nested.default)
    ) {
      return nested.default
    }
  }
  return isAsyncStorage(value) ? value : undefined
}

/**
 * Gets the AsyncStorage instance, importing it lazily on first use.
 *
 * @returns The AsyncStorage instance.
 * @throws {Error} If `@react-native-async-storage/async-storage` is not installed.
 */
async function getAsyncStorage(): Promise<AsyncStorageAPI> {
  if (resolvedAsyncStorage) {
    return resolvedAsyncStorage
  }

  try {
    // Dynamic import returns the module namespace; `.default` holds the AsyncStorage instance.
    // CJS interop may nest the default export, so we resolve both shapes.
    const mod: unknown = await import(ASYNC_STORAGE_PACKAGE)
    const storage = resolveAsyncStorage(mod)
    if (!storage) throw new TypeError('The module does not expose the AsyncStorage API')
    resolvedAsyncStorage = storage
    return storage
  } catch (error) {
    throw new Error(
      t(
        'storage.error.asyncStorageUnavailable',
        {},
        {
          defaultValue:
            '`@react-native-async-storage/async-storage` is not installed. Install it with: `npm install @react-native-async-storage/async-storage`',
        },
      ),
      { cause: error },
    )
  }
}

/**
 * Creates an AsyncStorage-based storage provider that implements the molecule StorageProvider interface.
 *
 * Uses React Native's `@react-native-async-storage/async-storage` as the underlying storage engine.
 * Supports key prefixing and custom serialization/deserialization.
 *
 * @example
 * ```ts
 * import { createAsyncStorageProvider } from '@molecule/app-storage-async-storage'
 * import { setProvider } from '@molecule/app-storage'
 *
 * const storage = createAsyncStorageProvider({
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
 * @param config - Optional configuration for key prefix and serialization.
 * @returns A `StorageProvider` backed by React Native AsyncStorage.
 */
export function createAsyncStorageProvider(config: AsyncStorageConfig = {}): StorageProvider {
  const logger = getLogger('storage')
  const { prefix = '', serialize = JSON.stringify, deserialize = JSON.parse } = config

  // Helper to get prefixed key
  const getKey = (key: string): string => `${prefix}${key}`

  // Helper to strip prefix from key
  const stripPrefix = (key: string): string => {
    if (prefix && key.startsWith(prefix)) {
      return key.slice(prefix.length)
    }
    return key
  }

  const provider: StorageProvider = {
    async get<T = unknown>(key: string): Promise<T | null> {
      try {
        const storage = await getAsyncStorage()
        const value = await storage.getItem(getKey(key))

        if (value === null) {
          return null
        }

        return deserialize(value) as T
      } catch (err) {
        logger.warn('Failed to get value from AsyncStorage', key, err)
        return null
      }
    },

    async set<T = unknown>(key: string, value: T): Promise<void> {
      try {
        const storage = await getAsyncStorage()
        const serialized = serialize(value)
        await storage.setItem(getKey(key), serialized)
      } catch (error) {
        throw new Error(
          t(
            'storage.error.setFailed',
            { key },
            { defaultValue: 'Failed to set value for key "{{key}}" in AsyncStorage' },
          ),
          { cause: error },
        )
      }
    },

    async remove(key: string): Promise<void> {
      const storage = await getAsyncStorage()
      await storage.removeItem(getKey(key))
    },

    async clear(): Promise<void> {
      const storage = await getAsyncStorage()

      if (prefix) {
        // Only clear prefixed keys
        const allKeys = await storage.getAllKeys()
        const prefixedKeys = allKeys.filter((key) => key.startsWith(prefix))

        if (prefixedKeys.length > 0) {
          await storage.multiRemove(prefixedKeys)
        }
      } else {
        await storage.clear()
      }
    },

    async keys(): Promise<string[]> {
      const storage = await getAsyncStorage()
      const allKeys = await storage.getAllKeys()

      if (prefix) {
        return allKeys.filter((key) => key.startsWith(prefix)).map((key) => stripPrefix(key))
      }

      return [...allKeys]
    },

    async getMany<T = unknown>(keys: string[]): Promise<Map<string, T | null>> {
      const storage = await getAsyncStorage()
      const prefixedKeys = keys.map((key) => getKey(key))
      const pairs = await storage.multiGet(prefixedKeys)
      const result = new Map<string, T | null>()

      for (const [prefixedKey, value] of pairs) {
        const originalKey = stripPrefix(prefixedKey)

        if (value === null || value === undefined) {
          result.set(originalKey, null)
        } else {
          try {
            result.set(originalKey, deserialize(value) as T)
          } catch (err) {
            logger.warn('Failed to deserialize stored value', originalKey, err)
            result.set(originalKey, null)
          }
        }
      }

      return result
    },

    async setMany<T = unknown>(entries: Array<[string, T]>): Promise<void> {
      const storage = await getAsyncStorage()
      const pairs: Array<[string, string]> = entries.map(([key, value]) => [
        getKey(key),
        serialize(value),
      ])
      await storage.multiSet(pairs)
    },

    async removeMany(keys: string[]): Promise<void> {
      const storage = await getAsyncStorage()
      const prefixedKeys = keys.map((key) => getKey(key))
      await storage.multiRemove(prefixedKeys)
    },
  }

  return provider
}

/** Default AsyncStorage provider created with no prefix and JSON serialization. */
export const provider: StorageProvider = createAsyncStorageProvider()
