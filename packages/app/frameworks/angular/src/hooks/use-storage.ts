/**
 * Angular functions for storage, mirroring `useStorageProvider`,
 * `useStorageValue`, `useStoragePreference` and `useStorage` from
 * `@molecule/app-react`.
 *
 * @module
 */

import { DestroyRef, inject, type Signal, signal } from '@angular/core'

import { getPreferenceStore, type StorageProvider } from '@molecule/app-storage'

import { injectProvider } from '../inject.js'
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
 * @param key - Storage key.
 * @param options - Hook options (`defaultValue`, `sync`).
 * @returns The value, its mutators, and the loading/error state as signals.
 */
export function useStorageValue<T>(
  key: string,
  options?: UseStorageValueOptions<T>,
): UseStorageValueResult<T> {
  const storage = useStorageProvider()
  const { defaultValue, sync = false } = options ?? {}

  const value = signal<T | undefined>(defaultValue)
  const loading = signal(true)
  const error = signal<Error | null>(null)
  /**
   * Incremented by every local write. A read that started before it must not
   * replace the newer value — the user editing before the first read lands is
   * the common case on a slow (native, encrypted) backend.
   */
  let writeVersion = 0
  const destroyRef = inject(DestroyRef)
  let mounted = true
  destroyRef.onDestroy(() => {
    mounted = false
  })

  // Load the key's value.
  const version = writeVersion
  const loadValue = async (): Promise<void> => {
    try {
      const stored = await storage.get<T>(key)
      if (!mounted) return
      // A write made after this read started holds the newer value; the read still ends loading.
      if (writeVersion === version) value.set(stored ?? defaultValue)
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
  if (sync && storage.subscribe) {
    const stop = storage.subscribe(key, (next) => {
      writeVersion += 1
      value.set(next === null ? defaultValue : (next as T))
    })
    destroyRef.onDestroy(stop)
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
      value.set(defaultValue)
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
 * @param key - The storage key, or `null` when there is nothing to persist.
 * @param options - `defaultValue`, reported until the provider supplies one.
 * @returns The current value, its mutators, and whether it is definite yet.
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

  const value = signal<T | undefined>(read())
  const ready = signal<boolean>(!key)

  const destroyRef = inject(DestroyRef)
  if (!key) {
    ready.set(true)
    value.set(defaultValue)
  } else {
    let cancelled = false
    const sync = (): void => {
      if (!cancelled) value.set(read())
    }
    // Seed from whatever the store already knows, then let hydration converge
    // it. With a synchronous provider this is a no-op change.
    sync()
    ready.set(false)
    const stop = store.subscribe(key, sync)
    destroyRef.onDestroy(() => {
      cancelled = true
      stop()
    })
    store
      .hydrate([key])
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
  }

  const setValue = (next: T | ((previous: T | undefined) => T)): void => {
    const resolved =
      typeof next === 'function' ? (next as (previous: T | undefined) => T)(value()) : next
    value.set(resolved)
    if (key) store.set(key, resolved)
  }

  const removeValue = (): void => {
    value.set(defaultValue)
    if (key) store.remove(key)
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
