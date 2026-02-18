/**
 * Svelte stores for storage.
 *
 * @module
 */

import { type Subscriber, type Unsubscriber, writable } from 'svelte/store'

import type { StorageProvider } from '@molecule/app-storage'

import { getStorageProvider } from '../context.js'
import type { StorageValueState } from '../types.js'

/**
 * A storage value store with subscribe, load, set, and remove.
 */
interface StorageStore<T> {
  subscribe: (run: Subscriber<StorageValueState<T>>, invalidate?: () => void) => Unsubscriber
  load: () => Promise<T | undefined>
  set: (value: T) => Promise<void>
  remove: () => Promise<void>
}

/**
 * Storage helper functions.
 */
interface StorageHelpers {
  get: <T>(key: string) => Promise<T | null>
  set: <T>(key: string, value: T) => Promise<void>
  remove: (key: string) => Promise<void>
  clear: () => Promise<void>
  keys: () => Promise<string[]>
}

/**
 * Create a storage value store.
 *
 * @param key - Storage key
 * @param defaultValue - Default value if not found
 * @returns Store with value and actions
 *
 * @example
 * ```svelte
 * <script>
 *   import { createStorageStore } from '`@molecule/app-svelte`'
 *
 *   const theme = createStorageStore('theme', 'light')
 *
 *   // Load on mount
 *   onMount(() => theme.load())
 * </script>
 *
 * {#if $theme.loading}
 *   <p>Loading...</p>
 * {:else}
 *   <select
 *     value={$theme.value}
 *     on:change={(e) => theme.set(e.target.value)}
 *   >
 *     <option value="light">Light</option>
 *     <option value="dark">Dark</option>
 *   </select>
 * {/if}
 * ```
 */
export function createStorageStore<T>(key: string, defaultValue?: T): StorageStore<T> {
  const storage = getStorageProvider()

  const store = writable<StorageValueState<T>>({
    value: defaultValue,
    loading: true,
    error: null,
  })

  const load = async (): Promise<T | undefined> => {
    store.update((s: StorageValueState<T>) => ({ ...s, loading: true, error: null }))

    try {
      const value = await storage.get<T>(key)
      store.set({
        value: value ?? defaultValue,
        loading: false,
        error: null,
      })
      return value ?? defaultValue
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      store.set({
        value: defaultValue,
        loading: false,
        error: err,
      })
      return defaultValue
    }
  }

  const set = async (value: T): Promise<void> => {
    try {
      await storage.set(key, value)
      store.update((s: StorageValueState<T>) => ({ ...s, value, error: null }))
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      store.update((s: StorageValueState<T>) => ({ ...s, error: err }))
      throw err
    }
  }

  const remove = async (): Promise<void> => {
    try {
      await storage.remove(key)
      store.update((s: StorageValueState<T>) => ({ ...s, value: defaultValue, error: null }))
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      store.update((s: StorageValueState<T>) => ({ ...s, error: err }))
      throw err
    }
  }

  return {
    subscribe: store.subscribe,
    load,
    set,
    remove,
  }
}

/**
 * Create storage helper functions from context.
 *
 * @returns Storage functions
 */
export function createStorageHelpers(): StorageHelpers {
  const storage = getStorageProvider()

  return {
    get: <T>(key: string) => storage.get<T>(key),
    set: <T>(key: string, value: T) => storage.set(key, value),
    remove: (key: string) => storage.remove(key),
    clear: () => storage.clear(),
    keys: () => storage.keys(),
  }
}

/**
 * Create storage store from a specific provider.
 *
 * @param storage - Storage provider
 * @param key - Storage key
 * @param defaultValue - Default value
 * @returns Store with value and actions
 */
export function createStorageStoreFromProvider<T>(
  storage: StorageProvider,
  key: string,
  defaultValue?: T,
): StorageStore<T> {
  const store = writable<StorageValueState<T>>({
    value: defaultValue,
    loading: true,
    error: null,
  })

  const load = async (): Promise<T | undefined> => {
    store.update((s: StorageValueState<T>) => ({ ...s, loading: true, error: null }))
    try {
      const value = await storage.get<T>(key)
      store.set({ value: value ?? defaultValue, loading: false, error: null })
      return value ?? defaultValue
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      store.set({ value: defaultValue, loading: false, error: err })
      return defaultValue
    }
  }

  const set = async (value: T): Promise<void> => {
    try {
      await storage.set(key, value)
      store.update((s: StorageValueState<T>) => ({ ...s, value, error: null }))
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      store.update((s: StorageValueState<T>) => ({ ...s, error: err }))
      throw err
    }
  }

  return {
    subscribe: store.subscribe,
    load,
    set,
    remove: async () => {
      await storage.remove(key)
      store.update((s: StorageValueState<T>) => ({ ...s, value: defaultValue, error: null }))
    },
  }
}
