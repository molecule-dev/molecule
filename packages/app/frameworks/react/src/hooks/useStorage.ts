/**
 * React hook for storage.
 *
 * @module
 */

import { useCallback, useContext, useEffect, useRef, useState } from 'react'

import { t } from '@molecule/app-i18n'
import { getPreferenceStore, type StorageProvider } from '@molecule/app-storage'

import { StorageContext } from '../contexts.js'
import { useCommittedRef } from '../render/useCommittedRef.js'
import { useEffectEvent } from '../render/useEffectEvent.js'
import { useStableCallback } from '../render/useStableCallback.js'

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
  /**
   * The latest `defaultValue`, read from the effect and its subscription and
   * kept out of their dependencies: an object written inline
   * (`{ defaultValue: { size: 1 } }`) is a new object on every render and would
   * otherwise re-read storage on every render.
   */
  const readDefault = useEffectEvent(() => defaultValue)
  /** The key `value` belongs to. */
  const [valueKey, setValueKey] = useState(key)
  if (valueKey !== key) {
    // A new key's value is unknown until its read lands: show what a fresh mount shows.
    setValueKey(key)
    setValueState(defaultValue)
    setLoading(true)
    setError(null)
  }

  // Load the key's value
  useEffect(() => {
    let mounted = true
    const version = writeVersion.current

    const loadValue = async (): Promise<void> => {
      try {
        const stored = await storage.get<T>(key)
        if (!mounted) return
        // A write made after this read started holds the newer value; the read still ends loading.
        if (writeVersion.current === version) setValueState(stored ?? readDefault())
        setLoading(false)
      } catch (err) {
        if (!mounted) return
        if (writeVersion.current === version) {
          setError(err instanceof Error ? err : new Error(String(err)))
        }
        setLoading(false)
      }
    }

    void loadValue()

    return () => {
      mounted = false
    }
  }, [key, storage])

  // Sync across tabs if supported — through the PROVIDER's own subscription, so
  // a non-browser backend (native, encrypted, memory) propagates the same way
  // instead of being limited to the browser `storage` event.
  useEffect(() => {
    if (!sync || !storage.subscribe) return

    return storage.subscribe(key, (next) => {
      writeVersion.current += 1
      setValueState(next === null ? readDefault() : (next as T))
    })
  }, [key, sync, storage])

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

  const removeValue = useStableCallback(async () => {
    writeVersion.current += 1
    try {
      await storage.remove(key)
      setValueState(defaultValue)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      throw err
    }
  })

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
  const defaultValue = options?.defaultValue

  /**
   * The latest `defaultValue`, read from the effect and its subscription and
   * kept out of their dependencies: an object written inline is a new object on
   * every render and would otherwise resubscribe on every render.
   */
  const readDefault = useEffectEvent(() => defaultValue)

  /** Reads a key from the store; `undefined` means the store has nothing for it. */
  const readStored = useCallback(
    (forKey: string | null | undefined): T | undefined => {
      if (!forKey) return undefined
      const stored = store.get<T>(forKey)
      return stored === null ? undefined : stored
    },
    [store],
  )

  const [value, setValueState] = useState<T | undefined>(() =>
    key ? (readStored(key) ?? defaultValue) : defaultValue,
  )
  /**
   * The key whose hydration has landed. `ready` is false for any other key, so
   * a key change is unready from its first render instead of one render later.
   */
  const [readyKey, setReadyKey] = useState<string | null>(null)
  const [trackedKey, setTrackedKey] = useState(key)
  if (trackedKey !== key) {
    // A new key's value comes from the store during render, so the first render
    // showing that key already renders it instead of the previous key's value.
    setTrackedKey(key)
    setValueState(key ? (readStored(key) ?? defaultValue) : defaultValue)
  }
  const ready = !key || readyKey === key

  /** The value the actions below compute from, before React has re-rendered. */
  const valueRef = useRef<T | undefined>(value)
  // Written at commit, so a render React throws away leaves no trace.
  useCommittedRef(valueRef, value)

  useEffect(() => {
    if (!key) return
    let cancelled = false
    const sync = (): void => {
      if (cancelled) return
      const stored = store.get<T>(key)
      setValueState(stored === null ? readDefault() : stored)
    }
    const stop = store.subscribe(key, sync)
    void store.hydrate([key]).then(() => {
      if (cancelled) return
      sync()
      setReadyKey(key)
    })
    return () => {
      cancelled = true
      stop()
    }
  }, [store, key])

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

  const removeValue = useStableCallback((): void => {
    valueRef.current = defaultValue
    setValueState(defaultValue)
    if (key) store.remove(key)
  })

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
