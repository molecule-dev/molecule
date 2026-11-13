/**
 * Solid.js primitives for storage.
 *
 * @module
 */

import { type Accessor, createEffect, createSignal, onCleanup, useContext } from 'solid-js'

import { t } from '@molecule/app-i18n'
import { getPreferenceStore, type StorageProvider } from '@molecule/app-storage'

import { getStorageProvider, StorageContext } from '../context.js'
import type { StorageValueState } from '../types.js'

/**
 * The storage provider from the nearest `MoleculeProvider`
 * (`config.storage`), under React's hook name.
 *
 * @returns The storage provider from context.
 * @throws {Error} When no `MoleculeProvider` above configures `storage`.
 */
export function useStorageProvider(): StorageProvider {
  const provider = useContext(StorageContext)
  if (!provider) {
    throw new Error(
      t('solid.error.useStorageOutsideProvider', undefined, {
        defaultValue: 'useStorageProvider must be used within a StorageProvider',
      }),
    )
  }
  return provider
}

/**
 * Options for {@link useStorageValue}.
 *
 * @template T - The stored value type.
 */
export interface UseStorageValueOptions<T> {
  /** Default value if key doesn't exist. */
  defaultValue?: T
  /** Whether to sync across tabs/windows (if supported by storage provider). */
  sync?: boolean
}

/**
 * What {@link useStorageValue} returns (the same names React returns).
 *
 * @template T - The stored value type.
 */
export interface UseStorageValueResult<T> {
  /** The current value as an accessor. */
  value: Accessor<T | undefined>
  /** Persists the value and updates the state. */
  setValue: (value: T) => Promise<void>
  /** Removes the key and restores the default value. */
  removeValue: () => Promise<void>
  /** Whether the first read is still in flight, as an accessor. */
  loading: Accessor<boolean>
  /** The read/write failure, as an accessor. */
  error: Accessor<Error | null>
}

/**
 * One storage key as reactive state, under React's hook name.
 *
 * A read that started before a local write lands is discarded, so a slow
 * backend never replaces a newer value. With `sync`, the provider's own
 * subscription delivers another tab's writes.
 *
 * @param key - Storage key.
 * @param options - Default value and cross-tab sync.
 * @returns The value, loading and error state as accessors, and the mutators.
 * @throws {Error} When no `MoleculeProvider` above configures `storage`.
 * @example
 * ```tsx
 * const { value: theme, setValue: setTheme, loading } = useStorageValue<string>('theme', {
 *   defaultValue: 'light',
 * })
 * ```
 */
export function useStorageValue<T>(
  key: string,
  options?: UseStorageValueOptions<T>,
): UseStorageValueResult<T> {
  const storage = useStorageProvider()
  const { defaultValue, sync = false } = options ?? {}

  const [value, setValueState] = createSignal<T | undefined>(defaultValue)
  const [loading, setLoading] = createSignal<boolean>(true)
  const [error, setError] = createSignal<Error | null>(null)
  /**
   * Incremented by every local write. A read that started before it must not
   * replace the newer value — the user editing before the first read lands is
   * the common case on a slow (native, encrypted) backend.
   */
  let writeVersion = 0
  /** The latest `defaultValue`, read at use (an inline object is fine). */
  const defaultRef = (): T | undefined => defaultValue

  // Load the key's value (React runs this in its mount effect; the kit
  // flushes before the first snapshot either way).
  {
    const version = writeVersion
    const loadValue = async (): Promise<void> => {
      try {
        const stored = await storage.get<T>(key)
        if (writeVersion === version) setValueState(() => stored ?? defaultRef())
        setLoading(false)
      } catch (err) {
        if (writeVersion === version) {
          setError(err instanceof Error ? err : new Error(String(err)))
        }
        setLoading(false)
      }
    }

    void loadValue()
  }

  // Sync across tabs if supported — through the PROVIDER's own subscription,
  // so a non-browser backend (native, encrypted, memory) propagates the same
  // way instead of being limited to the browser `storage` event.
  if (sync && storage.subscribe) {
    const unsubscribe = storage.subscribe(key, (next) => {
      writeVersion += 1
      setValueState(() => (next === null ? defaultRef() : (next as T)))
    })
    onCleanup(unsubscribe)
  }

  const setValue = async (newValue: T): Promise<void> => {
    writeVersion += 1
    try {
      await storage.set(key, newValue)
      setValueState(() => newValue)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      throw err
    }
  }

  const removeValue = async (): Promise<void> => {
    writeVersion += 1
    try {
      await storage.remove(key)
      setValueState(() => defaultRef())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      throw err
    }
  }

  return {
    value,
    setValue,
    removeValue,
    loading,
    error,
  }
}

/**
 * Options for {@link useStoragePreference}.
 *
 * @template T - The preference value type.
 */
export interface UseStoragePreferenceOptions<T> {
  /**
   * Value reported until the provider supplies one. It is NEVER written to
   * storage: a default is a display fallback, not a decision the user made.
   */
  defaultValue?: T
}

/**
 * What {@link useStoragePreference} returns (the same names React returns).
 *
 * @template T - The preference value type.
 */
export interface UseStoragePreferenceResult<T> {
  /** The persisted value (or `defaultValue` while none is known), as an accessor. */
  value: Accessor<T | undefined>
  /**
   * Writes the value through the preference store: subscribers update
   * immediately and persistence is best-effort. Accepts an updater function.
   */
  setValue: (next: T | ((previous: T | undefined) => T)) => void
  /** Removes the key through the preference store. */
  removeValue: () => void
  /** `true` once the store has a definite answer, as an accessor. */
  ready: Accessor<boolean>
}

/**
 * One persisted preference through the module-singleton preference store
 * (`getPreferenceStore()` over the BONDED provider — not the context), under
 * React's hook name.
 *
 * A render-time value is available immediately when the bonded provider can
 * answer synchronously, and an asynchronous provider's hydration CONVERGES
 * onto the same accessor without a remount. Ordering is the store's: a read
 * that started before a newer write, remove or external change is discarded.
 *
 * Pass `null` for `key` while the real key is unknown: the hook then behaves
 * as local state around `defaultValue` and persists nothing.
 *
 * @param key - The storage key, or `null` when there is nothing to persist.
 * @param options - `defaultValue`, reported until the provider supplies one.
 * @returns The value, its mutators, and whether it is definite yet.
 * @example
 * ```tsx
 * const { value: width, setValue: setWidth, ready } = useStoragePreference<number>(key, {
 *   defaultValue: 280,
 * })
 * ```
 */
export function useStoragePreference<T = unknown>(
  key: string | null | undefined,
  options?: UseStoragePreferenceOptions<T>,
): UseStoragePreferenceResult<T> {
  const store = getPreferenceStore()
  const defaultValueRef = (): T | undefined => options?.defaultValue

  const read = (): T | undefined => {
    if (!key) return defaultValueRef()
    const stored = store.get<T>(key)
    return stored === null ? defaultValueRef() : stored
  }

  const [value, setValueState] = createSignal<T | undefined>(read())
  const [ready, setReady] = createSignal<boolean>(!key)
  const valueRef = { current: value() }
  valueRef.current = value()

  {
    if (!key) {
      setReady(true)
      setValueState(() => defaultValueRef())
    } else {
      let cancelled = false
      const sync = (): void => {
        if (!cancelled) setValueState(() => read())
      }
      // Seed from whatever the store already knows, then let hydration
      // converge it. With a synchronous provider this is a no-op change.
      sync()
      setReady(false)
      const stop = store.subscribe(key, sync)
      void store.hydrate([key]).then(() => {
        if (cancelled) return
        sync()
        setReady(true)
      })
      onCleanup(() => {
        cancelled = true
        stop()
      })
    }
  }

  const setValue = (next: T | ((previous: T | undefined) => T)): void => {
    const resolved =
      typeof next === 'function' ? (next as (previous: T | undefined) => T)(valueRef.current) : next
    valueRef.current = resolved
    setValueState(() => resolved)
    if (key) store.set(key, resolved)
  }

  const removeValue = (): void => {
    valueRef.current = defaultValueRef()
    setValueState(() => defaultValueRef())
    if (key) store.remove(key)
  }

  return { value, setValue, removeValue, ready }
}

/**
 * The provider's storage operations as stable functions, no reactive state —
 * under React's hook name.
 *
 * @returns get, set, remove, clear and keys, straight through the provider.
 * @throws {Error} When no `MoleculeProvider` above configures `storage`.
 */
export function useStorage(): {
  get: <T>(key: string) => Promise<T | null>
  set: <T>(key: string, value: T) => Promise<void>
  remove: (key: string) => Promise<void>
  clear: () => Promise<void>
  keys: () => Promise<string[]>
} {
  const storage = useStorageProvider()

  return {
    get: <T>(key: string) => storage.get<T>(key),
    set: <T>(key: string, value: T) => storage.set(key, value),
    remove: (key: string) => storage.remove(key),
    clear: () => storage.clear(),
    keys: () => storage.keys(),
  }
}

/**
 * Create a storage value primitive.
 *
 * @param key - Storage key
 * @param defaultValue - Default value if not found
 * @returns Storage value accessor and actions
 *
 * @example
 * ```tsx
 * import { createStorageValue } from '@molecule/app-solid'
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
