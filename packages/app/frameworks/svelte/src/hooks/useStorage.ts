/**
 * Svelte hooks for storage, porting React's `useStorage` family.
 *
 * @module
 */

import { onDestroy } from 'svelte'
import { type Readable, writable } from 'svelte/store'

import { getPreferenceStore, type StorageProvider } from '@molecule/app-storage'

import { useStorageProvider } from '../context.js'

/**
 * Options for {@link useStorageValue}.
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
 * Result of {@link useStorageValue}.
 */
export interface UseStorageValueResult<T> {
  /** The stored value, or the default while none is stored. */
  value: Readable<T | undefined>
  /** Persists the value; rejects when the provider refuses the write. */
  setValue: (value: T) => Promise<void>
  /** Removes the key and falls back to the default; rejects on failure. */
  removeValue: () => Promise<void>
  /** Whether the first read is still in flight. */
  loading: Readable<boolean>
  /** The failing read's or write's error. */
  error: Readable<Error | null>
}

/**
 * One storage key as Svelte stores, React's `useStorageValue` in Svelte's
 * idiom: call it during component init under `setMoleculeContext({ storage })`.
 *
 * A read that started before a newer local write keeps that write's value (it
 * still ends `loading`), and with `sync` an outside write reaches the hook
 * through the provider's own subscription — so a non-browser backend
 * (native, encrypted, memory) propagates the same way, not just the browser
 * `storage` event.
 *
 * @param key - Storage key
 * @param options - Hook options
 * @returns Storage value state (value, loading, error) and mutators (setValue, removeValue).
 * @example
 * ```svelte
 * <script>
 *   import { useStorageValue } from '@molecule/app-svelte'
 *   const { value: theme, setValue: setTheme, loading } = useStorageValue('theme', {
 *     defaultValue: 'light',
 *   })
 * </script>
 *
 * {#if $loading}<Spinner />
 * {:else}<select onchange={(e) => setTheme(e.currentTarget.value)}>…</select>{/if}
 * ```
 */
export function useStorageValue<T>(
  key: string,
  options?: UseStorageValueOptions<T>,
): UseStorageValueResult<T> {
  const storage = useStorageProvider()
  const { defaultValue, sync = false } = options ?? {}

  const value = writable<T | undefined>(defaultValue)
  const loading = writable(true)
  const error = writable<Error | null>(null)

  // Incremented by every local write. A read that started before it must not
  // replace the newer value — the user editing before the first read lands is
  // the common case on a slow (native, encrypted) backend.
  let writeVersion = 0
  // The latest `defaultValue`, held like React's ref so a later options object
  // (an inline default) keeps working without re-reading storage.
  const currentDefault = defaultValue
  let mounted = true
  onDestroy(() => {
    mounted = false
  })

  // Load the key's value (React's mount effect).
  const loadValue = async (): Promise<void> => {
    const version = writeVersion
    try {
      const stored = await storage.get<T>(key)
      if (!mounted) return
      // A write made after this read started holds the newer value; the read still ends loading.
      if (writeVersion === version) value.set((stored ?? currentDefault) as T | undefined)
      loading.set(false)
    } catch (err) {
      if (!mounted) return
      if (writeVersion === version) {
        error.set(err instanceof Error ? err : new Error(String(err)))
      }
      loading.set(false)
    }
  }

  void loadValue()

  // Sync across tabs if supported — through the PROVIDER's own subscription, so
  // a non-browser backend (native, encrypted, memory) propagates the same way
  // instead of being limited to the browser `storage` event.
  let stopSync: (() => void) | null = null
  if (sync && storage.subscribe) {
    stopSync = storage.subscribe(key, (next) => {
      writeVersion += 1
      value.set(next === null ? currentDefault : (next as T))
    })
    onDestroy(() => {
      stopSync?.()
      stopSync = null
    })
  }

  const setValue = async (newValue: T): Promise<void> => {
    writeVersion += 1
    try {
      await storage.set(key, newValue)
      value.set(newValue)
      error.set(null)
    } catch (err) {
      error.set(err instanceof Error ? err : new Error(String(err)))
      throw err
    }
  }

  const removeValue = async (): Promise<void> => {
    writeVersion += 1
    try {
      await storage.remove(key)
      value.set(currentDefault)
      error.set(null)
    } catch (err) {
      error.set(err instanceof Error ? err : new Error(String(err)))
      throw err
    }
  }

  return {
    value: { subscribe: value.subscribe },
    setValue,
    removeValue,
    loading: { subscribe: loading.subscribe },
    error: { subscribe: error.subscribe },
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
  value: Readable<T | undefined>
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
  ready: Readable<boolean>
}

/**
 * Subscribes Svelte stores to ONE persisted preference, React's
 * `useStoragePreference` in Svelte's idiom.
 *
 * This is the component-side half of `getPreferenceStore()`: an init-time
 * value is available immediately when the bonded provider can answer
 * synchronously, and an asynchronous provider's hydration CONVERGES onto the
 * same component without a remount. Ordering is the store's: a read that
 * started before a newer write, remove or external change is discarded, so a
 * slow hydration never overwrites an edit the user already made.
 *
 * Pass `null` for `key` while the real key is unknown (no project selected
 * yet): the hook then behaves as local state around `defaultValue` and
 * persists nothing.
 *
 * @param key - The storage key, or `null` when there is nothing to persist.
 * @param options - `defaultValue`, reported until the provider supplies one.
 * @returns The current value, its mutators, and whether it is definite yet.
 * @example
 * ```svelte
 * <script>
 *   import { useStoragePreference } from '@molecule/app-svelte'
 *   const { value: width, setValue: setWidth, ready } = useStoragePreference(key, {
 *     defaultValue: 280,
 *   })
 * </script>
 * ```
 */
export function useStoragePreference<T = unknown>(
  key: string | null | undefined,
  options?: UseStoragePreferenceOptions<T>,
): UseStoragePreferenceResult<T> {
  const store = getPreferenceStore()
  const defaultValue = options?.defaultValue

  const read = (): T | undefined => {
    if (!key) return defaultValue
    const stored = store.get<T>(key)
    return stored === null ? defaultValue : stored
  }

  const initial = read()
  const value = writable<T | undefined>(initial)
  const ready = writable<boolean>(!key)
  // The value `setValue`'s functional form receives, kept beside the store.
  let currentValue = initial

  if (!key) {
    ready.set(true)
    value.set(defaultValue)
    currentValue = defaultValue
  } else {
    let cancelled = false
    const sync = (): void => {
      if (!cancelled) {
        const next = read()
        value.set(next)
        currentValue = next
      }
    }
    // Seed from whatever the store already knows, then let hydration converge
    // it. With a synchronous provider this is a no-op change.
    sync()
    ready.set(false)
    const stop = store.subscribe(key, sync)
    onDestroy(() => {
      cancelled = true
      stop()
    })
    void store.hydrate([key]).then(() => {
      if (cancelled) return
      sync()
      ready.set(true)
    })
  }

  const setValue = (next: T | ((previous: T | undefined) => T)): void => {
    const resolved =
      typeof next === 'function' ? (next as (previous: T | undefined) => T)(currentValue) : next
    currentValue = resolved
    value.set(resolved)
    if (key) store.set(key, resolved)
  }

  const removeValue = (): void => {
    currentValue = defaultValue
    value.set(defaultValue)
    if (key) store.remove(key)
  }

  return {
    value: { subscribe: value.subscribe },
    setValue,
    removeValue,
    ready: { subscribe: ready.subscribe },
  }
}

/**
 * Storage operations without local state sync, React's `useStorage` in
 * Svelte's idiom: plain passthroughs of the context provider.
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
  const storage: StorageProvider = useStorageProvider()

  return {
    get: <T>(key: string) => storage.get<T>(key),
    set: <T>(key: string, value: T) => storage.set(key, value),
    remove: (key: string) => storage.remove(key),
    clear: () => storage.clear(),
    keys: () => storage.keys(),
  }
}
