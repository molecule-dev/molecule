/**
 * Angular functions for storage, mirroring `useStorageProvider`,
 * `useStorageValue`, `useStoragePreference` and `useStorage` from
 * `@molecule/app-react`.
 *
 * @module
 */

import { DestroyRef, effect, inject, type Signal, signal, untracked } from '@angular/core'

import { getPreferenceStore, type StorageProvider } from '@molecule/app-storage'

import { injectProvider } from '../inject.js'
import { type MaybeSignal, readMaybeSignal } from '../maybe-signal.js'
import { STORAGE_PROVIDER } from '../tokens.js'

/**
 * The storage provider registered by `provideMolecule({ storage })` or
 * `provideStorage`. Call it in an injection context.
 *
 * @returns The storage provider.
 * @throws {Error} When no storage provider is registered.
 */
export function useStorageProvider(): StorageProvider {
  return injectProvider(
    STORAGE_PROVIDER,
    'useStorageOutsideProvider',
    'useStorageProvider must be used within a StorageProvider',
  )
}

/**
 * Options for {@link useStorageValue}.
 *
 * @template T - The value's shape.
 */
export interface UseStorageValueOptions<T> {
  /** Default value if the key doesn't exist. */
  defaultValue?: T
  /** Whether to sync across tabs/windows (if supported by storage provider). */
  sync?: boolean
}

/**
 * Result of {@link useStorageValue}: every state field as a signal and the
 * mutators as plain functions.
 *
 * @template T - The value's shape.
 */
export interface UseStorageValueResult<T> {
  /** The stored value, the default while absent, `undefined` while unknown. */
  readonly value: Signal<T | undefined>
  /** Writes the value through the provider and publishes it. */
  setValue: (value: T) => Promise<void>
  /** Removes the key; the value falls back to the default. */
  removeValue: () => Promise<void>
  /** Whether the first read for the key is still in flight. */
  readonly loading: Signal<boolean>
  /** The read or write failure, cleared by the next successful operation. */
  readonly error: Signal<Error | null>
}

/**
 * Manages one storage value. Call it in an injection context (a component
 * field initializer or constructor).
 *
 * A write bumps a version counter, so a read that started before it never
 * replaces the newer value; a read that started before a write still ends
 * loading. `sync` subscribes through the PROVIDER's own change subscription, so
 * a non-browser backend propagates the same way instead of being limited to
 * the browser `storage` event.
 *
 * The arguments may be signals: a new key then starts over on the same
 * component (the value falls back to the default, loading turns true and the
 * new key is read and subscribed), the way React re-renders `useStorageValue`
 * with a new key. The value, its pending write and any error survive the
 * change, as React's state does.
 *
 * @param key - Storage key (or a signal of it).
 * @param options - Hook options (`defaultValue`, `sync`), or a signal of them.
 * @returns The value, its mutators, and the loading/error state as signals.
 */
export function useStorageValue<T>(
  key: MaybeSignal<string>,
  options?: MaybeSignal<UseStorageValueOptions<T>>,
): UseStorageValueResult<T> {
  const storage = useStorageProvider()
  const initialOptions = readMaybeSignal(options) ?? {}

  const value = signal<T | undefined>(initialOptions.defaultValue)
  const loading = signal(true)
  const error = signal<Error | null>(null)
  /**
   * Incremented by every local write. A read that started before it must not
   * replace the newer value — the user editing before the first read lands is
   * the common case on a slow (native, encrypted) backend.
   */
  let writeVersion = 0
  const destroyRef = inject(DestroyRef)

  // Load the key's value. Each load owns a `current` flag: a newer load (a key
  // change) or the component's end supersedes it, exactly like the `mounted`
  // closure of React's read effect. The default is read when the read resolves,
  // like React's `defaultRef.current`.
  const loadValue = (currentKey: string): (() => void) => {
    let current = true
    const version = writeVersion
    const run = async (): Promise<void> => {
      try {
        const stored = await storage.get<T>(currentKey)
        if (!current) return
        // A write made after this read started holds the newer value; the read still ends loading.
        if (writeVersion === version) value.set(stored ?? readMaybeSignal(options)?.defaultValue)
        loading.set(false)
      } catch (err) {
        if (!current) return
        if (writeVersion === version) {
          error.set(err instanceof Error ? err : new Error(String(err)))
        }
        loading.set(false)
      }
    }
    void run()
    return () => {
      current = false
    }
  }

  // Sync across tabs if supported — through the PROVIDER's own subscription, so
  // a non-browser backend (native, encrypted, memory) propagates the same way
  // instead of being limited to the browser `storage` event. Re-keyed when the
  // key or the `sync` option changes, as React's effect's dependency array
  // re-runs it.
  let stopSync: (() => void) | null = null
  const syncKey = (currentKey: string, sync: boolean): void => {
    stopSync?.()
    stopSync = null
    if (!sync || !storage.subscribe) return
    stopSync = storage.subscribe(currentKey, (next) => {
      writeVersion += 1
      value.set(next === null ? readMaybeSignal(options)?.defaultValue : (next as T))
    })
  }

  let wiredKey = readMaybeSignal(key)
  let wiredSync = initialOptions.sync ?? false
  let stopLoad = loadValue(wiredKey)
  syncKey(wiredKey, wiredSync)
  destroyRef.onDestroy(() => {
    stopLoad()
    stopSync?.()
  })

  // A new key's value is unknown until its read lands: show what a fresh mount
  // shows, then read and re-subscribe the new key — React does the reset at
  // render time and re-runs its two effects.
  effect(() => {
    const nextKey = readMaybeSignal(key)
    const nextSync = readMaybeSignal(options)?.sync ?? false
    if (nextKey === wiredKey && nextSync === wiredSync) return
    untracked(() => {
      if (nextKey !== wiredKey) {
        wiredKey = nextKey
        stopLoad()
        value.set(readMaybeSignal(options)?.defaultValue)
        loading.set(true)
        error.set(null)
        stopLoad = loadValue(nextKey)
      }
      wiredSync = nextSync
      syncKey(wiredKey, nextSync)
    })
  })

  const setValue = async (newValue: T): Promise<void> => {
    writeVersion += 1
    try {
      await storage.set(readMaybeSignal(key), newValue)
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
      await storage.remove(readMaybeSignal(key))
      value.set(readMaybeSignal(options)?.defaultValue)
      error.set(null)
    } catch (err) {
      error.set(err instanceof Error ? err : new Error(String(err)))
      throw err
    }
  }

  return {
    value: value.asReadonly(),
    setValue,
    removeValue,
    loading: loading.asReadonly(),
    error: error.asReadonly(),
  }
}

/**
 * Options for {@link useStoragePreference}.
 *
 * @template T - The value's shape.
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
 *
 * @template T - The value's shape.
 */
export interface UseStoragePreferenceResult<T> {
  /** The persisted value, or `defaultValue` while none is known. */
  readonly value: Signal<T | undefined>
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
  readonly ready: Signal<boolean>
}

/**
 * Subscribes to ONE persisted preference through `getPreferenceStore()`. Call
 * it in an injection context (a component field initializer or constructor).
 *
 * This is the component-side half of `getPreferenceStore()`: a value read at
 * injection time is available immediately when the bonded provider can answer
 * synchronously, and an asynchronous provider's hydration CONVERGES onto the
 * same component without a remount. Ordering is the store's: a read that
 * started before a newer write, remove or external change is discarded, so a
 * slow hydration never overwrites an edit the user already made.
 *
 * Pass `null` for `key` while the real key is unknown (no project selected
 * yet): the hook then behaves as local state around `defaultValue` and
 * persists nothing.
 *
 * The arguments may be signals: a new key then re-reads and re-subscribes that
 * key on the same component (its old subscription is dropped, hydration
 * converges it), the way React re-renders `useStoragePreference` with a new
 * key. The shown value survives the change, as React's state does.
 *
 * @param key - The storage key, or `null` when there is nothing to persist (or
 *   a signal of it).
 * @param options - `defaultValue`, reported until the provider supplies one
 *   (or a signal of them).
 * @returns The current value, its mutators, and whether it is definite yet.
 */
export function useStoragePreference<T = unknown>(
  key: MaybeSignal<string | null | undefined>,
  options?: MaybeSignal<UseStoragePreferenceOptions<T>>,
): UseStoragePreferenceResult<T> {
  const store = getPreferenceStore()

  const read = (): T | undefined => {
    const currentKey = readMaybeSignal(key)
    if (!currentKey) return readMaybeSignal(options)?.defaultValue
    const stored = store.get<T>(currentKey)
    return stored === null ? readMaybeSignal(options)?.defaultValue : stored
  }

  const value = signal<T | undefined>(read())
  const ready = signal<boolean>(!readMaybeSignal(key))

  const destroyRef = inject(DestroyRef)

  /**
   * Wires one key, exactly the body of React's subscription effect for that
   * key: seed from whatever the store already knows, then let hydration
   * converge it (a no-op change on a synchronous provider).
   *
   * @param currentKey - The key to wire (`null`/`undefined` is local state).
   * @returns The unwire function: cancels the hydration and unsubscribes.
   */
  const wire = (currentKey: string | null | undefined): (() => void) => {
    if (!currentKey) {
      ready.set(true)
      value.set(readMaybeSignal(options)?.defaultValue)
      return () => {}
    }
    let cancelled = false
    const sync = (): void => {
      if (!cancelled) value.set(read())
    }
    sync()
    ready.set(false)
    const stop = store.subscribe(currentKey, sync)
    store
      .hydrate([currentKey])
      .then(() => {
        if (cancelled) return
        sync()
        ready.set(true)
      })
      .catch((_error: unknown) => {
        // Hydration is best-effort by the store's contract (persistence and
        // read failures are swallowed there, and `hydrate` resolves once every
        // key has been ATTEMPTED); the value keeps the last known snapshot, and
        // `ready` still turns true so the UI is not stuck on a spinner.
        if (!cancelled) ready.set(true)
      })
    return () => {
      cancelled = true
      stop()
    }
  }

  let wiredKey: string | null | undefined = readMaybeSignal(key)
  let unwire = wire(wiredKey)
  // Reads the CURRENT unwire, so a key switch re-targets the cleanup too.
  destroyRef.onDestroy(() => {
    unwire()
  })

  // A changed key re-wires on the same component, as React's effect re-runs
  // when its key dependency changes: the old key's subscription is dropped
  // before the new one starts.
  effect(() => {
    const nextKey = readMaybeSignal(key)
    if (nextKey === wiredKey) return
    wiredKey = nextKey
    untracked(() => {
      unwire()
      unwire = wire(nextKey)
    })
  })

  const setValue = (next: T | ((previous: T | undefined) => T)): void => {
    const resolved =
      typeof next === 'function' ? (next as (previous: T | undefined) => T)(value()) : next
    value.set(resolved)
    const currentKey = readMaybeSignal(key)
    if (currentKey) store.set(currentKey, resolved)
  }

  const removeValue = (): void => {
    value.set(readMaybeSignal(options)?.defaultValue)
    const currentKey = readMaybeSignal(key)
    if (currentKey) store.remove(currentKey)
  }

  return { value: value.asReadonly(), setValue, removeValue, ready: ready.asReadonly() }
}

/**
 * The registered provider's operations as stable functions, no reactive state.
 * Call it in an injection context.
 *
 * @returns The get/set/remove/clear/keys functions.
 */
export function useStorage(): {
  get: <T>(key: string) => Promise<T | null>
  set: <T>(key: string, value: T) => Promise<void>
  remove: (key: string) => Promise<void>
  clear: () => Promise<void>
  keys: () => Promise<string[]>
} {
  const storage = useStorageProvider()

  const get = <T>(key: string): Promise<T | null> => storage.get<T>(key)
  const set = <T>(key: string, value: T): Promise<void> => storage.set(key, value)
  const remove = (key: string): Promise<void> => storage.remove(key)
  const clear = (): Promise<void> => storage.clear()
  const keys = (): Promise<string[]> => storage.keys()

  return { get, set, remove, clear, keys }
}
