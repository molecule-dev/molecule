/**
 * Vue composable for storage.
 *
 * @module
 */

import {
  getCurrentScope,
  inject,
  type MaybeRefOrGetter,
  onScopeDispose,
  type Ref,
  ref,
  toValue,
  watch,
} from 'vue'

import { t } from '@molecule/app-i18n'
import { getPreferenceStore, type StorageProvider } from '@molecule/app-storage'

import { StorageKey } from '../injection-keys.js'
import type {
  UseStoragePreferenceOptions,
  UseStoragePreferenceResult,
  UseStorageValueResult,
} from '../types.js'

/**
 * Composable to access the storage provider from injection.
 *
 * @returns The storage provider
 * @throws {Error} Error if used without providing storage
 */
export function useStorageProvider(): StorageProvider {
  const provider = inject(StorageKey)
  if (!provider) {
    throw new Error(
      t('vue.error.useStorageOutsideProvider', undefined, {
        defaultValue: 'useStorageProvider must be used within a StorageProvider',
      }),
    )
  }
  return provider
}

/**
 * Options for useStorageValue composable.
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
 * Composable to manage a single storage value with Vue reactivity.
 *
 * A read that started before a newer local write keeps that write's value
 * (it still ends `loading`), and with `sync` an outside write reaches the
 * composable through the provider's own subscription — the same contract as
 * React's `useStorageValue`.
 *
 * Both arguments may be reactive (a ref or a getter) and are followed on the
 * same component, the way React re-renders `useStorageValue`: a new `key`
 * starts over (its value is unknown until its read lands, exactly like a fresh
 * mount), `defaultValue` is read whenever it is used, and turning `sync` on or
 * off (re)subscribes.
 *
 * @param key - Storage key; may be reactive, and a change starts the new key
 *   over on the same component.
 * @param options - Composable options; may be reactive, and `defaultValue` is
 *   read at the moment it is used while `sync` is followed live.
 * @returns Value, setter, and loading state
 *
 * @example
 * ```vue
 * <script setup>
 * import { useStorageValue } from '@molecule/app-vue'
 *
 * const { value: theme, setValue: setTheme, loading } = useStorageValue('theme', {
 *   defaultValue: 'light'
 * })
 * </script>
 *
 * <template>
 *   <div v-if="loading">Loading...</div>
 *   <select v-else :value="theme" @change="setTheme($event.target.value)">
 *     <option value="light">Light</option>
 *     <option value="dark">Dark</option>
 *   </select>
 * </template>
 * ```
 */
export function useStorageValue<T>(
  key: MaybeRefOrGetter<string>,
  options?: MaybeRefOrGetter<UseStorageValueOptions<T> | undefined>,
): UseStorageValueResult<T> {
  const storage = useStorageProvider()

  // The latest `defaultValue`, read at the moment it is used — React's ref
  // updated on every render, so an inline default keeps working without
  // re-reading storage.
  const currentDefault = (): T | undefined => toValue(options)?.defaultValue

  // Reactive state
  const value = ref<T | undefined>(currentDefault()) as Ref<T | undefined>
  const loading = ref(true)
  const error = ref<Error | null>(null)

  // Incremented by every local write. A read that started before it must not
  // replace the newer value — the user editing before the first read lands is
  // the common case on a slow (native, encrypted) backend.
  let writeVersion = 0
  // Bumped whenever the key changes: a read of a PREVIOUS key is discarded
  // whole, exactly like React's load effect being cleaned up (its `mounted`
  // flag) before the new key's effect reads.
  let readEpoch = 0
  let mounted = true

  if (getCurrentScope()) {
    onScopeDispose(() => {
      mounted = false
    })
  }

  // Load the key's value.
  const loadValue = (currentKey: string): void => {
    const version = writeVersion
    const epoch = readEpoch
    storage
      .get<T>(currentKey)
      .then((stored) => {
        if (!mounted || epoch !== readEpoch) return
        // A write made after this read started holds the newer value; the read still ends loading.
        if (writeVersion === version) value.value = (stored ?? currentDefault()) as T | undefined
        loading.value = false
      })
      .catch((err: unknown) => {
        if (!mounted || epoch !== readEpoch) return
        if (writeVersion === version) {
          error.value = err instanceof Error ? err : new Error(String(err))
        }
        loading.value = false
      })
  }
  loadValue(toValue(key))

  // A new key starts over: its value is unknown until its read lands, showing
  // what a fresh mount shows.
  watch(
    () => toValue(key),
    (next) => {
      readEpoch++
      value.value = currentDefault()
      loading.value = true
      error.value = null
      loadValue(next)
    },
  )

  // Sync across tabs if supported — through the PROVIDER's own subscription, so
  // a non-browser backend (native, encrypted, memory) propagates the same way
  // instead of being limited to the browser `storage` event. React keys this
  // subscription on the key and the `sync` option; both are followed here.
  let stopSync: (() => void) | null = null
  const resubscribeSync = (): void => {
    stopSync?.()
    stopSync = null
    if ((toValue(options)?.sync ?? false) && storage.subscribe) {
      const currentKey = toValue(key)
      stopSync = storage.subscribe(currentKey, (next) => {
        writeVersion += 1
        value.value = next === null ? currentDefault() : (next as T)
      })
    }
  }
  resubscribeSync()
  watch([() => toValue(key), () => toValue(options)?.sync ?? false], () => {
    resubscribeSync()
  })
  if (getCurrentScope()) {
    onScopeDispose(() => {
      stopSync?.()
      stopSync = null
    })
  }

  const setValue = async (newValue: T): Promise<void> => {
    writeVersion += 1
    try {
      await storage.set(toValue(key), newValue)
      value.value = newValue
      error.value = null
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      throw err
    }
  }

  const removeValue = async (): Promise<void> => {
    writeVersion += 1
    try {
      await storage.remove(toValue(key))
      value.value = currentDefault()
      error.value = null
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      throw err
    }
  }

  return {
    value,
    loading,
    error,
    setValue,
    removeValue,
  }
}

/**
 * Subscribes Vue state to ONE persisted preference.
 *
 * This is the component-side half of `getPreferenceStore()`: a setup-time value
 * is available immediately when the bonded provider can answer synchronously,
 * and an asynchronous provider's hydration CONVERGES onto the same component
 * without a remount. Ordering is the store's: a read that started before a
 * newer write, remove or external change is discarded, so a slow hydration
 * never overwrites an edit the user already made.
 *
 * Pass `null` for `key` while the real key is unknown (no project selected
 * yet): the composable then behaves as local state around `defaultValue` and
 * persists nothing.
 *
 * Both arguments may be reactive (a ref or a getter) and are followed on the
 * same component, the way React re-renders `useStoragePreference`: a new `key`
 * re-seeds from the store and re-hydrates (the old key's subscription ends),
 * and `defaultValue` is read whenever it is used.
 *
 * @param key - The storage key, or `null` when there is nothing to persist;
 *   may be reactive, and a change re-reads the new key on the same component.
 * @param options - `defaultValue`, reported until the provider supplies one;
 *   may be reactive, and the default is read at the moment it is used.
 * @returns The current value, its mutators, and whether it is definite yet.
 *
 * @example
 * ```vue
 * <script setup>
 * import { useStoragePreference } from '@molecule/app-vue'
 *
 * const { value: width, setValue: setWidth, ready } = useStoragePreference(key, {
 *   defaultValue: 280,
 * })
 * // A drag calls setWidth(320): the UI updates now and the write persists.
 * // `ready` is false until hydration lands, so an effect must not persist the
 * // fallback before then.
 * </script>
 * ```
 */
export function useStoragePreference<T = unknown>(
  key: MaybeRefOrGetter<string | null | undefined>,
  options?: MaybeRefOrGetter<UseStoragePreferenceOptions<T> | undefined>,
): UseStoragePreferenceResult<T> {
  const store = getPreferenceStore()

  const read = (currentKey: string | null | undefined): T | undefined => {
    if (!currentKey) return toValue(options)?.defaultValue
    const stored = store.get<T>(currentKey)
    return stored === null ? toValue(options)?.defaultValue : stored
  }

  const value = ref<T | undefined>(undefined) as Ref<T | undefined>
  const ready = ref<boolean>(false)
  // The value `setValue`'s functional form receives, kept beside the ref.
  let currentValue: T | undefined

  // The per-key subscription block. React runs it as an effect keyed on the
  // key: on a key change the old effect's cleanup ends the old subscription
  // (its `cancelled` drops late hydrations) and the new effect starts over.
  let stop: (() => void) | null = null
  let cancelled = false
  const startKey = (currentKey: string | null | undefined): void => {
    cancelled = true
    stop?.()
    stop = null
    if (!currentKey) {
      ready.value = true
      currentValue = toValue(options)?.defaultValue
      value.value = currentValue
      return
    }
    cancelled = false
    const sync = (): void => {
      if (cancelled) return
      value.value = read(currentKey)
      currentValue = value.value
    }
    // Seed from whatever the store already knows, then let hydration converge
    // it. With a synchronous provider this is a no-op change.
    sync()
    ready.value = false
    stop = store.subscribe(currentKey, sync)
    void store.hydrate([currentKey]).then(() => {
      if (cancelled) return
      sync()
      ready.value = true
    })
  }
  startKey(toValue(key))
  watch(
    () => toValue(key),
    (next) => {
      startKey(next)
    },
  )
  if (getCurrentScope()) {
    onScopeDispose(() => {
      cancelled = true
      stop?.()
      stop = null
    })
  }

  const setValue = (next: T | ((previous: T | undefined) => T)): void => {
    const resolved =
      typeof next === 'function' ? (next as (previous: T | undefined) => T)(currentValue) : next
    currentValue = resolved
    value.value = resolved
    const currentKey = toValue(key)
    if (currentKey) store.set(currentKey, resolved)
  }

  const removeValue = (): void => {
    currentValue = toValue(options)?.defaultValue
    value.value = currentValue
    const currentKey = toValue(key)
    if (currentKey) store.remove(currentKey)
  }

  return { value, setValue, removeValue, ready }
}

/**
 * Composable for direct storage operations.
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

  return {
    get: <T>(key: string) => storage.get<T>(key),
    set: <T>(key: string, value: T) => storage.set(key, value),
    remove: (key: string) => storage.remove(key),
    clear: () => storage.clear(),
    keys: () => storage.keys(),
  }
}
