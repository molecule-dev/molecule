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
import { access, type MaybeAccessor } from './maybe-accessor.js'

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
 * @param key - Storage key. May be an accessor: a changed key starts over
 *   (default value shown, loading, error cleared) and loads its own value on
 *   the same mount, the way React re-renders `useStorageValue`.
 * @param options - Default value and cross-tab sync. May be an accessor; both
 *   fields are read at use, and only a real change of `key` or `sync`
 *   re-subscribes.
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
  key: MaybeAccessor<string>,
  options?: MaybeAccessor<UseStorageValueOptions<T>>,
): UseStorageValueResult<T> {
  const storage = useStorageProvider()
  /** The latest `defaultValue`, read at use (an inline object is fine). */
  const readDefault = (): T | undefined => access(options)?.defaultValue

  const [value, setValueState] = createSignal<T | undefined>(readDefault())
  const [loading, setLoading] = createSignal<boolean>(true)
  const [error, setError] = createSignal<Error | null>(null)
  /**
   * Incremented by every local write. A read that started before it must not
   * replace the newer value — the user editing before the first read lands is
   * the common case on a slow (native, encrypted) backend.
   */
  let writeVersion = 0

  /**
   * The read in flight for the current key. A newer key's read (or unmount)
   * settles it quietly — React's per-effect `mounted` local.
   */
  let cancelCurrentRead: (() => void) | null = null
  const load = (currentKey: string): void => {
    cancelCurrentRead?.()
    const version = writeVersion
    let active = true
    cancelCurrentRead = (): void => {
      active = false
    }
    const loadValue = async (): Promise<void> => {
      try {
        const stored = await storage.get<T>(currentKey)
        if (!active) return
        // A write made after this read started holds the newer value; the
        // read still ends loading.
        if (writeVersion === version) setValueState(() => stored ?? readDefault())
        setLoading(false)
      } catch (err) {
        if (!active) return
        if (writeVersion === version) {
          setError(err instanceof Error ? err : new Error(String(err)))
        }
        setLoading(false)
      }
    }
    void loadValue()
  }
  onCleanup(() => {
    cancelCurrentRead?.()
    cancelCurrentRead = null
  })

  // A key change starts over and re-reads (React's [key, storage] effect plus
  // its render-time reset). The sentinel makes the first run load the mount
  // key; the key guard means an options-only change reads nothing.
  let activeKey: string | null = null
  createEffect(() => {
    const currentKey = access(key)
    if (currentKey === activeKey) return
    activeKey = currentKey
    // A new key's value is unknown until its read lands: show what a fresh
    // mount shows.
    setValueState(() => readDefault())
    setLoading(true)
    setError(null)
    load(currentKey)
  })

  // Sync across tabs if supported — through the PROVIDER's own subscription,
  // so a non-browser backend (native, encrypted, memory) propagates the same
  // way instead of being limited to the browser `storage` event. React keys
  // this on [key, sync, storage]; the manual unsubscribe survives an
  // unrelated options re-read that must not drop it.
  let stopSync: (() => void) | null = null
  let syncState: { key: string; sync: boolean } | null = null
  createEffect(() => {
    const currentKey = access(key)
    const sync = access(options)?.sync ?? false
    if (syncState && syncState.key === currentKey && syncState.sync === sync) return
    syncState = { key: currentKey, sync }
    stopSync?.()
    stopSync = null
    if (!sync || !storage.subscribe) return
    stopSync = storage.subscribe(currentKey, (incoming) => {
      writeVersion += 1
      setValueState(() => (incoming === null ? readDefault() : (incoming as T)))
    })
  })
  onCleanup(() => {
    stopSync?.()
    stopSync = null
  })

  const setValue = async (newValue: T): Promise<void> => {
    writeVersion += 1
    try {
      await storage.set(access(key), newValue)
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
      await storage.remove(access(key))
      setValueState(() => readDefault())
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
 *   May be an accessor: a changed key re-seeds, re-subscribes and re-hydrates
 *   on the same mount, the way React re-renders `useStoragePreference`.
 * @param options - `defaultValue`, reported until the provider supplies one.
 *   May be an accessor; the default is read at use.
 * @returns The value, its mutators, and whether it is definite yet.
 * @example
 * ```tsx
 * const { value: width, setValue: setWidth, ready } = useStoragePreference<number>(key, {
 *   defaultValue: 280,
 * })
 * ```
 */
export function useStoragePreference<T = unknown>(
  key: MaybeAccessor<string | null | undefined>,
  options?: MaybeAccessor<UseStoragePreferenceOptions<T>>,
): UseStoragePreferenceResult<T> {
  const store = getPreferenceStore()
  const defaultValueRef = (): T | undefined => access(options)?.defaultValue

  const read = (currentKey: string | null | undefined): T | undefined => {
    if (!currentKey) return defaultValueRef()
    const stored = store.get<T>(currentKey)
    return stored === null ? defaultValueRef() : stored
  }

  const initialKey = access(key)
  const [value, setValueState] = createSignal<T | undefined>(read(initialKey))
  const [ready, setReady] = createSignal<boolean>(!initialKey)
  const valueRef = { current: value() }

  /** Stops the current key's subscription and pending hydration. */
  let stopSubscription: (() => void) | null = null
  let cancelHydration: (() => void) | null = null

  /** React's [store, key, read] effect for one key: seed, subscribe, hydrate. */
  const attach = (currentKey: string | null | undefined): void => {
    cancelHydration?.()
    cancelHydration = null
    stopSubscription?.()
    stopSubscription = null
    if (!currentKey) {
      // Local state around the default; persists nothing.
      setReady(true)
      const fallback = defaultValueRef()
      valueRef.current = fallback
      setValueState(() => fallback)
      return
    }
    let cancelled = false
    cancelHydration = (): void => {
      cancelled = true
    }
    const sync = (): void => {
      if (cancelled) return
      const next = read(currentKey)
      valueRef.current = next
      setValueState(() => next)
    }
    // Seed from whatever the store already knows, then let hydration
    // converge it. With a synchronous provider this is a no-op change.
    sync()
    setReady(false)
    stopSubscription = store.subscribe(currentKey, sync)
    void store.hydrate([currentKey]).then(() => {
      if (cancelled) return
      sync()
      setReady(true)
    })
  }
  onCleanup(() => {
    cancelHydration?.()
    cancelHydration = null
    stopSubscription?.()
    stopSubscription = null
  })

  // A changed key re-attaches on the same mount; the key guard means an
  // options-only change re-hydrates nothing. The first run attaches the
  // mount key.
  let attachedKey: string | null | undefined
  let attached = false
  createEffect(() => {
    const currentKey = access(key)
    if (attached && Object.is(currentKey, attachedKey)) return
    attached = true
    attachedKey = currentKey
    attach(currentKey)
  })

  const setValue = (next: T | ((previous: T | undefined) => T)): void => {
    const resolved =
      typeof next === 'function' ? (next as (previous: T | undefined) => T)(valueRef.current) : next
    valueRef.current = resolved
    setValueState(() => resolved)
    const currentKey = access(key)
    if (currentKey) store.set(currentKey, resolved)
  }

  const removeValue = (): void => {
    const fallback = defaultValueRef()
    valueRef.current = fallback
    setValueState(() => fallback)
    const currentKey = access(key)
    if (currentKey) store.remove(currentKey)
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
