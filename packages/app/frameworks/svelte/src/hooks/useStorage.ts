/**
 * Svelte hooks for storage, porting React's `useStorage` family.
 *
 * @module
 */

import { onDestroy } from 'svelte'
import { get, type Readable, writable } from 'svelte/store'

import { getPreferenceStore, type StorageProvider } from '@molecule/app-storage'

import { useStorageProvider } from '../context.js'
import { type MaybeReadable, toReadable } from './maybe-readable.js'

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
 * Both arguments may be a plain value or a readable store of one (a store
 * holding `undefined` means the argument was omitted): setting the `key` store
 * starts the new key over — its value is unknown until its read lands, so the
 * default shows and `loading` is true, exactly as a fresh mount — while writes
 * go to the key the hook holds at the moment they run. The latest
 * `defaultValue` and `sync` always apply.
 *
 * A read that started before a newer local write keeps that write's value (it
 * still ends `loading`), and with `sync` an outside write reaches the hook
 * through the provider's own subscription — so a non-browser backend
 * (native, encrypted, memory) propagates the same way, not just the browser
 * `storage` event.
 *
 * @param key - Storage key (or a store of it).
 * @param options - Hook options (or a store of them).
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
  key: MaybeReadable<string>,
  options?: MaybeReadable<UseStorageValueOptions<T> | undefined>,
): UseStorageValueResult<T> {
  const storage = useStorageProvider()
  const keyStore = toReadable(key)
  const optionsStore = toReadable(options)
  const defaultOf = (): T | undefined => get(optionsStore)?.defaultValue
  const syncEnabled = (): boolean => get(optionsStore)?.sync ?? false

  const value = writable<T | undefined>(defaultOf())
  const loading = writable(true)
  const error = writable<Error | null>(null)

  // Incremented by every local write. A read that started before it must not
  // replace the newer value — the user editing before the first read lands is
  // the common case on a slow (native, encrypted) backend.
  let writeVersion = 0
  // The key whose read is current: a key change kills the old read (React's
  // per-effect `mounted` flag), so a late landing does nothing at all.
  let readEpoch = 0
  let mounted = true
  onDestroy(() => {
    mounted = false
  })

  // Load one key's value (React's load effect, keyed on the key).
  const loadKey = (keyToLoad: string): void => {
    // A new key's value is unknown until its read lands: show what a fresh
    // mount shows (React's render-time reset for a changed key).
    value.set(defaultOf())
    loading.set(true)
    error.set(null)

    const epoch = ++readEpoch
    const version = writeVersion
    void storage
      .get<T>(keyToLoad)
      .then((stored) => {
        if (!mounted || epoch !== readEpoch) return
        // A write made after this read started holds the newer value; the read still ends loading.
        if (writeVersion === version) value.set((stored ?? defaultOf()) as T | undefined)
        loading.set(false)
      })
      .catch((err: unknown) => {
        if (!mounted || epoch !== readEpoch) return
        if (writeVersion === version) {
          error.set(err instanceof Error ? err : new Error(String(err)))
        }
        loading.set(false)
      })
  }
  loadKey(get(keyStore))

  // Sync across tabs if supported — through the PROVIDER's own subscription, so
  // a non-browser backend (native, encrypted, memory) propagates the same way
  // instead of being limited to the browser `storage` event. Re-armed whenever
  // the key or the `sync` option changes (React's [key, sync, storage] effect).
  let stopSync: (() => void) | null = null
  const armSync = (): void => {
    stopSync?.()
    stopSync = null
    if (syncEnabled() && storage.subscribe) {
      stopSync = storage.subscribe(get(keyStore), (next) => {
        writeVersion += 1
        value.set(next === null ? defaultOf() : (next as T))
      })
    }
  }
  armSync()
  onDestroy(() => {
    stopSync?.()
    stopSync = null
  })

  // Follow the key: a changed key loads its own value; a changed `sync`
  // re-arms the subscription. The stores call back at once with the values
  // already read, which changes nothing.
  let currentKey = get(keyStore)
  let currentSync = syncEnabled()
  const stopKey = keyStore.subscribe((next) => {
    const syncNow = syncEnabled()
    if (Object.is(next, currentKey) && Object.is(syncNow, currentSync)) return
    const keyChanged = !Object.is(next, currentKey)
    currentKey = next
    currentSync = syncNow
    if (keyChanged) loadKey(next)
    else armSync()
  })
  onDestroy(stopKey)

  const setValue = async (newValue: T): Promise<void> => {
    writeVersion += 1
    try {
      await storage.set(get(keyStore), newValue)
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
      await storage.remove(get(keyStore))
      value.set(defaultOf())
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
 * Both arguments may be a plain value or a readable store of one (a store
 * holding `undefined` means the argument was omitted): setting the `key` store
 * re-reads, re-subscribes and re-hydrates the new key on the same component
 * (a `null`/`undefined` key is local state around the default and persists
 * nothing), and writes go to the key the hook holds at the moment they run.
 * The latest `defaultValue` always applies.
 *
 * @param key - The storage key, or `null` when there is nothing to persist
 *   (or a store of either).
 * @param options - `defaultValue`, reported until the provider supplies one
 *   (or a store of them).
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
  key: MaybeReadable<string | null | undefined>,
  options?: MaybeReadable<UseStoragePreferenceOptions<T> | undefined>,
): UseStoragePreferenceResult<T> {
  const store = getPreferenceStore()
  const keyStore = toReadable(key)
  const optionsStore = toReadable(options)
  const defaultOf = (): T | undefined => get(optionsStore)?.defaultValue
  const currentKey = (): string | null | undefined => get(keyStore)

  const read = (): T | undefined => {
    const keyNow = currentKey()
    if (!keyNow) return defaultOf()
    const stored = store.get<T>(keyNow)
    return stored === null ? defaultOf() : stored
  }

  const initial = read()
  const value = writable<T | undefined>(initial)
  const ready = writable<boolean>(!currentKey())
  // The value `setValue`'s functional form receives, kept beside the store.
  let currentValue = initial

  // React's [store, key, read] effect for one key: seed from whatever the
  // store already knows, then let hydration converge it. With a synchronous
  // provider the seed is a no-op change. A replaced key tears the old one
  // down first, so its late hydration is discarded.
  let stopStore: (() => void) | null = null
  let cancelled = false
  const followKey = (keyToFollow: string | null | undefined): void => {
    stopStore?.()
    stopStore = null
    cancelled = true
    if (!keyToFollow) {
      ready.set(true)
      const fallback = defaultOf()
      value.set(fallback)
      currentValue = fallback
      return
    }
    cancelled = false
    const sync = (): void => {
      if (cancelled) return
      const next = read()
      value.set(next)
      currentValue = next
    }
    // Seed from whatever the store already knows, then let hydration converge
    // it. With a synchronous provider this is a no-op change.
    sync()
    ready.set(false)
    stopStore = store.subscribe(keyToFollow, sync)
    void store.hydrate([keyToFollow]).then(() => {
      if (cancelled) return
      sync()
      ready.set(true)
    })
  }
  followKey(currentKey())
  onDestroy(() => {
    cancelled = true
    stopStore?.()
    stopStore = null
  })

  // Follow the key source: the store calls back at once with the key already
  // read, which changes nothing.
  let followedKey = currentKey()
  const stopKey = keyStore.subscribe((next) => {
    if (Object.is(next, followedKey)) return
    followedKey = next
    followKey(next)
  })
  onDestroy(stopKey)

  const setValue = (next: T | ((previous: T | undefined) => T)): void => {
    const resolved =
      typeof next === 'function' ? (next as (previous: T | undefined) => T)(currentValue) : next
    currentValue = resolved
    value.set(resolved)
    const keyNow = currentKey()
    if (keyNow) store.set(keyNow, resolved)
  }

  const removeValue = (): void => {
    const fallback = defaultOf()
    currentValue = fallback
    value.set(fallback)
    const keyNow = currentKey()
    if (keyNow) store.remove(keyNow)
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
