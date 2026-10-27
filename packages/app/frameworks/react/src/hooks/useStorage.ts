/**
 * React hook for storage.
 *
 * @module
 */

import { useCallback, useContext, useEffect, useRef, useState } from 'react'

import { t } from '@molecule/app-i18n'
import { getPreferenceStore, type StorageProvider } from '@molecule/app-storage'

import { StorageContext } from '../contexts.js'

/**
 * Hook to access the storage provider from context.
 *
 * @returns The storage provider from context
 * @throws {Error} Error if used outside of StorageProvider
 */
export function useStorageProvider(): StorageProvider {
  const provider = useContext(StorageContext)
  if (!provider) {
    throw new Error(
      t('react.error.useStorageOutsideProvider', undefined, {
        defaultValue: 'useStorageProvider must be used within a StorageProvider',
      }),
    )
  }
  return provider
}

/**
 * Options for useStorageValue hook.
 */
export interface UseStorageValueOptions<T> {
  /**
   * Default value if key doesn't exist.
   */
  defaultValue?: T
  /**
   * Whether to sync across tabs/windows (if supported by storage provider).
   */
  sync?: boolean
}

/**
 * Result of useStorageValue hook.
 */
export interface UseStorageValueResult<T> {
  value: T | undefined
  setValue: (value: T) => Promise<void>
  removeValue: () => Promise<void>
  loading: boolean
  error: Error | null
}

/**
 * Hook to manage a single storage value with React state sync.
 *
 * @param key - Storage key
 * @param options - Hook options
 *
 * @example
 * ```tsx
 * const { value: theme, setValue: setTheme, loading } = useStorageValue<string>('theme', {
 *   defaultValue: 'light'
 * })
 *
 * if (loading) return <Spinner />
 * return (
 *   <select value={theme} onChange={(e) => setTheme(e.target.value)}>
 *     <option value="light">Light</option>
 *     <option value="dark">Dark</option>
 *   </select>
 * )
 * ```
 * @returns Storage value state (value, loading, error) and mutators (setValue, removeValue).
 */
export function useStorageValue<T>(
  key: string,
  options?: UseStorageValueOptions<T>,
): UseStorageValueResult<T> {
  const storage = useStorageProvider()
  const { defaultValue, sync = false } = options ?? {}

  const [value, setValueState] = useState<T | undefined>(defaultValue)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  /**
   * Incremented by every local write. A read that started before it must not
   * replace the newer value — the user editing before the first read lands is
   * the common case on a slow (native, encrypted) backend.
   */
  const writeVersion = useRef(0)

  // Load initial value
  useEffect(() => {
    let mounted = true
    const version = writeVersion.current

    const loadValue = async (): Promise<void> => {
      try {
        const stored = await storage.get<T>(key)
        if (mounted && writeVersion.current === version) {
          setValueState(stored ?? defaultValue)
          setLoading(false)
        }
      } catch (err) {
        if (mounted && writeVersion.current === version) {
          setError(err instanceof Error ? err : new Error(String(err)))
          setLoading(false)
        }
      }
    }

    loadValue()

    return () => {
      mounted = false
    }
  }, [key, storage, defaultValue])

  // Sync across tabs if supported — through the PROVIDER's own subscription, so
  // a non-browser backend (native, encrypted, memory) propagates the same way
  // instead of being limited to the browser `storage` event.
  useEffect(() => {
    if (!sync || !storage.subscribe) return

    return storage.subscribe(key, (next) => {
      writeVersion.current += 1
      setValueState(next === null ? defaultValue : (next as T))
    })
  }, [key, sync, storage, defaultValue])

  const setValue = useCallback(
    async (newValue: T) => {
      writeVersion.current += 1
      try {
        await storage.set(key, newValue)
        setValueState(newValue)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
        throw err
      }
    },
    [key, storage],
  )

  const removeValue = useCallback(async () => {
    writeVersion.current += 1
    try {
      await storage.remove(key)
      setValueState(defaultValue)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      throw err
    }
  }, [key, storage, defaultValue])

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
 */
export interface UseStoragePreferenceOptions<T> {
  /**
   * Value reported until the provider supplies one. It is NEVER written to
   * storage: a default is a display fallback, not a decision the user made.
   */
  defaultValue?: T
}

/**
 * Result of {@link useStoragePreference}.
 */
export interface UseStoragePreferenceResult<T> {
  /** The persisted value, or `defaultValue` while none is known. */
  value: T | undefined
  /**
   * Writes the value through the preference store: subscribers update
   * immediately and persistence is best-effort.
   */
  setValue: (next: T | ((previous: T | undefined) => T)) => void
  /** Removes the key through the preference store. */
  removeValue: () => void
  /**
   * `true` once the store has a definite answer — the synchronous snapshot on
   * a synchronous provider, or the hydration result on an asynchronous one.
   */
  ready: boolean
}

/**
 * Subscribes React state to ONE persisted preference.
 *
 * This is the component-side half of `getPreferenceStore()`: a render-time value
 * is available immediately when the bonded provider can answer synchronously,
 * and an asynchronous provider's hydration CONVERGES onto the same component
 * without a remount. Ordering is the store's: a read that started before a
 * newer write, remove or external change is discarded, so a slow hydration
 * never overwrites an edit the user already made.
 *
 * Pass `null` for `key` while the real key is unknown (no project selected
 * yet): the hook then behaves as local state around `defaultValue` and persists
 * nothing.
 *
 * @param key - The storage key, or `null` when there is nothing to persist.
 * @param options - `defaultValue`, reported until the provider supplies one.
 * @returns The current value, its mutators, and whether it is definite yet.
 *
 * @example
 * ```tsx
 * const { value: width, setValue: setWidth, ready } = useStoragePreference<number>(key, {
 *   defaultValue: 280,
 * })
 * // A drag calls setWidth(320): the UI updates now and the write persists.
 * // `ready` is false until hydration lands, so an effect must not persist the
 * // fallback before then.
 * ```
 */
export function useStoragePreference<T = unknown>(
  key: string | null | undefined,
  options?: UseStoragePreferenceOptions<T>,
): UseStoragePreferenceResult<T> {
  const store = getPreferenceStore()
  const defaultValueRef = useRef<T | undefined>(options?.defaultValue)
  defaultValueRef.current = options?.defaultValue

  const read = useCallback((): T | undefined => {
    if (!key) return defaultValueRef.current
    const stored = store.get<T>(key)
    return stored === null ? defaultValueRef.current : stored
  }, [store, key])

  const [value, setValueState] = useState<T | undefined>(read)
  const [ready, setReady] = useState<boolean>(!key)
  const valueRef = useRef<T | undefined>(value)
  valueRef.current = value

  useEffect(() => {
    if (!key) {
      setReady(true)
      setValueState(defaultValueRef.current)
      return
    }
    let cancelled = false
    const sync = (): void => {
      if (!cancelled) setValueState(read())
    }
    // Seed from whatever the store already knows, then let hydration converge
    // it. With a synchronous provider this is a no-op change.
    sync()
    setReady(false)
    const stop = store.subscribe(key, sync)
    void store.hydrate([key]).then(() => {
      if (cancelled) return
      sync()
      setReady(true)
    })
    return () => {
      cancelled = true
      stop()
    }
  }, [store, key, read])

  const setValue = useCallback(
    (next: T | ((previous: T | undefined) => T)): void => {
      const resolved =
        typeof next === 'function'
          ? (next as (previous: T | undefined) => T)(valueRef.current)
          : next
      valueRef.current = resolved
      setValueState(resolved)
      if (key) store.set(key, resolved)
    },
    [store, key],
  )

  const removeValue = useCallback((): void => {
    valueRef.current = defaultValueRef.current
    setValueState(defaultValueRef.current)
    if (key) store.remove(key)
  }, [store, key])

  return { value, setValue, removeValue, ready }
}

/**
 * Hook for simple storage operations without React state sync.
 *
 * @returns Storage operation methods
 */
export function useStorage(): {
  get: <T>(key: string) => Promise<T | null>
  set: <T>(key: string, value: T) => Promise<void>
  remove: (key: string) => Promise<void>
  clear: () => Promise<void>
  keys: () => Promise<string[]>
} {
  const storage = useStorageProvider()

  const get = useCallback(<T>(key: string) => storage.get<T>(key), [storage])

  const set = useCallback(<T>(key: string, value: T) => storage.set(key, value), [storage])

  const remove = useCallback((key: string) => storage.remove(key), [storage])

  const clear = useCallback(() => storage.clear(), [storage])

  const keys = useCallback(() => storage.keys(), [storage])

  return {
    get,
    set,
    remove,
    clear,
    keys,
  }
}
