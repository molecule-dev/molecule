/**
 * Solid.js primitives for storage.
 *
 * @module
 */

import { type Accessor, createEffect, createSignal } from 'solid-js'

import type { StorageProvider } from '@molecule/app-storage'

import { getStorageProvider } from '../context.js'
import type { StorageValueState } from '../types.js'

/**
 * Create a storage value primitive.
 *
 * @param key - Storage key
 * @param defaultValue - Default value if not found
 * @returns Storage value accessor and actions
 *
 * @example
 * ```tsx
 * import { createStorageValue } from '`@molecule/app-solid`'
 *
 * function ThemeSelector() {
 *   const { value, set, loading } = createStorageValue<string>('theme', 'light')
 *
 *   return (
 *     <Show when={!loading()} fallback={<Loading />}>
 *       <select
 *         value={value()}
 *         onChange={(e) => set(e.target.value)}
 *       >
 *         <option value="light">Light</option>
 *         <option value="dark">Dark</option>
 *       </select>
 *     </Show>
 *   )
 * }
 * ```
 */
export function createStorageValue<T>(
  key: string,
  defaultValue?: T,
): {
  value: () => T | undefined
  loading: () => boolean
  error: () => Error | null
  set: (value: T) => Promise<void>
  remove: () => Promise<void>
  refresh: () => Promise<T | undefined>
} {
  const storage = getStorageProvider()

  const [state, setState] = createSignal<StorageValueState<T>>({
    value: defaultValue,
    loading: true,
    error: null,
  })

  // Load initial value
  createEffect(() => {
    storage
      .get<T>(key)
      .then((value) => {
        setState({
          value: value ?? defaultValue,
          loading: false,
          error: null,
        })
      })
      .catch((err) => {
        setState({
          value: defaultValue,
          loading: false,
          error: err instanceof Error ? err : new Error(String(err)),
        })
      })
  })

  const set = async (value: T): Promise<void> => {
    try {
      await storage.set(key, value)
      setState((prev: StorageValueState<T>) => ({ ...prev, value, error: null }))
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setState((prev: StorageValueState<T>) => ({ ...prev, error }))
      throw error
    }
  }

  const remove = async (): Promise<void> => {
    try {
      await storage.remove(key)
      setState((prev: StorageValueState<T>) => ({ ...prev, value: defaultValue, error: null }))
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setState((prev: StorageValueState<T>) => ({ ...prev, error }))
      throw error
    }
  }

  const refresh = async (): Promise<T | undefined> => {
    setState((prev: StorageValueState<T>) => ({ ...prev, loading: true }))
    try {
      const value = await storage.get<T>(key)
      setState({
        value: value ?? defaultValue,
        loading: false,
        error: null,
      })
      return value ?? defaultValue
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setState({
        value: defaultValue,
        loading: false,
        error,
      })
      return defaultValue
    }
  }

  return {
    value: () => state().value,
    loading: () => state().loading,
    error: () => state().error,
    set,
    remove,
    refresh,
  }
}

/**
 * Create storage primitives.
 *
 * @returns Storage methods
 *
 * @example
 * ```tsx
 * function SettingsManager() {
 *   const storage = createStorage()
 *
 *   const saveSettings = async (settings: Settings) => {
 *     await storage.set('settings', settings)
 *   }
 *
 *   const loadSettings = async () => {
 *     return await storage.get<Settings>('settings')
 *   }
 * }
 * ```
 */
export function createStorage(): {
  get: <T>(key: string) => Promise<T | null>
  set: <T>(key: string, value: T) => Promise<void>
  remove: (key: string) => Promise<void>
  clear: () => Promise<void>
  keys: () => Promise<string[]>
} {
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
 * Create a persisted signal that syncs with storage.
 *
 * @param key - Storage key
 * @param defaultValue - Default value
 * @returns Tuple of accessor and setter
 *
 * @example
 * ```tsx
 * function Counter() {
 *   const [count, setCount] = usePersistedSignal('counter', 0)
 *
 *   return (
 *     <button onClick={() => setCount((c) => (c ?? 0) + 1)}>
 *       Count: {count() ?? 0}
 *     </button>
 *   )
 * }
 * ```
 */
export function usePersistedSignal<T>(
  key: string,
  defaultValue: T,
): [Accessor<T | undefined>, (value: T | ((prev: T | undefined) => T)) => void] {
  const storage = getStorageProvider()
  const [value, setValue] = createSignal<T | undefined>(defaultValue)

  // Load initial value
  createEffect(() => {
    storage.get<T>(key).then((stored) => {
      if (stored != null) {
        setValue(() => stored as T)
      }
    })
  })

  // Persist on change (skip initial)
  let initialized = false
  createEffect(() => {
    const current = value()
    if (initialized && current !== undefined) {
      storage.set(key, current)
    }
    initialized = true
  })

  const setAndPersist = (newValue: T | ((prev: T | undefined) => T)): void => {
    if (typeof newValue === 'function') {
      setValue((prev: T | undefined) => {
        const next = (newValue as (prev: T | undefined) => T)(prev)
        storage.set(key, next)
        return next
      })
    } else {
      setValue(() => newValue)
      storage.set(key, newValue)
    }
  }

  return [value, setAndPersist]
}

/**
 * Create storage helpers from context.
 *
 * @returns Storage helper functions
 */
export function createStorageHelpers(): {
  get: <T>(key: string) => Promise<T | null>
  set: <T>(key: string, value: T) => Promise<void>
  remove: (key: string) => Promise<void>
  clear: () => Promise<void>
  keys: () => Promise<string[]>
} {
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
 * Create storage primitives from a specific provider.
 *
 * @param storage - Storage provider
 * @returns Storage methods
 */
export function createStorageFromProvider(storage: StorageProvider): {
  get: <T>(key: string) => Promise<T | null>
  set: <T>(key: string, value: T) => Promise<void>
  remove: (key: string) => Promise<void>
  clear: () => Promise<void>
  keys: () => Promise<string[]>
} {
  return {
    get: <T>(key: string) => storage.get<T>(key),
    set: <T>(key: string, value: T) => storage.set(key, value),
    remove: (key: string) => storage.remove(key),
    clear: () => storage.clear(),
    keys: () => storage.keys(),
  }
}

/**
 * Create storage value primitive from a specific provider.
 *
 * @param storage - Storage provider
 * @param key - Storage key
 * @param defaultValue - Default value
 * @returns Storage value accessor and actions
 */
export function createStorageValueFromProvider<T>(
  storage: StorageProvider,
  key: string,
  defaultValue?: T,
): {
  value: () => T | undefined
  loading: () => boolean
  error: () => Error | null
  set: (value: T) => Promise<void>
  remove: () => Promise<void>
} {
  const [state, setState] = createSignal<StorageValueState<T>>({
    value: defaultValue,
    loading: true,
    error: null,
  })

  createEffect(() => {
    storage
      .get<T>(key)
      .then((value) => {
        setState({
          value: value ?? defaultValue,
          loading: false,
          error: null,
        })
      })
      .catch((err) => {
        setState({
          value: defaultValue,
          loading: false,
          error: err instanceof Error ? err : new Error(String(err)),
        })
      })
  })

  return {
    value: () => state().value,
    loading: () => state().loading,
    error: () => state().error,
    set: async (value: T) => {
      await storage.set(key, value)
      setState((prev: StorageValueState<T>) => ({ ...prev, value, error: null }))
    },
    remove: async () => {
      await storage.remove(key)
      setState((prev: StorageValueState<T>) => ({ ...prev, value: defaultValue, error: null }))
    },
  }
}
