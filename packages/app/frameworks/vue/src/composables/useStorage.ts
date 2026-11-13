/**
 * Vue composable for storage.
 *
 * @module
 */

import { getCurrentScope, inject, onScopeDispose, type Ref, ref } from 'vue'

import { t } from '@molecule/app-i18n'
import { getPreferenceStore, type StorageProvider } from '@molecule/app-storage'

import { StorageKey } from '../injection-keys.js'
import type {
  UseStoragePreferenceOptions,
  UseStoragePreferenceReturn,
  UseStorageValueReturn,
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
 * @param key - Storage key
 * @param options - Composable options
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
  key: string,
  options?: UseStorageValueOptions<T>,
): UseStorageValueReturn<T> {
  const storage = useStorageProvider()
  const { defaultValue, sync = false } = options ?? {}

  // Reactive state
  const value = ref<T | undefined>(defaultValue) as Ref<T | undefined>
  const loading = ref(true)
  const error = ref<Error | null>(null)

  // Incremented by every local write. A read that started before it must not
  // replace the newer value — the user editing before the first read lands is
  // the common case on a slow (native, encrypted) backend.
  let writeVersion = 0
  // The latest `defaultValue`, held like React's ref so later options objects
  // (an inline default) keep working without re-reading storage.
  const currentDefault = defaultValue
  let mounted = true

  if (getCurrentScope()) {
    onScopeDispose(() => {
      mounted = false
    })
  }

  // Load the key's value.
  const loadValue = async (): Promise<void> => {
    const version = writeVersion
    try {
      const stored = await storage.get<T>(key)
      if (!mounted) return
      // A write made after this read started holds the newer value; the read still ends loading.
      if (writeVersion === version) value.value = (stored ?? currentDefault) as T | undefined
      loading.value = false
    } catch (err) {
      if (!mounted) return
      if (writeVersion === version) {
        error.value = err instanceof Error ? err : new Error(String(err))
      }
      loading.value = false
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
      value.value = next === null ? currentDefault : (next as T)
    })
    if (getCurrentScope()) {
      onScopeDispose(() => {
        stopSync?.()
        stopSync = null
      })
    }
  }

  const setValue = async (newValue: T): Promise<void> => {
    writeVersion += 1
    try {
      await storage.set(key, newValue)
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
      await storage.remove(key)
      value.value = currentDefault
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
 * @param key - The storage key, or `null` when there is nothing to persist.
 * @param options - `defaultValue`, reported until the provider supplies one.
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
  key: string | null | undefined,
  options?: UseStoragePreferenceOptions<T>,
): UseStoragePreferenceReturn<T> {
  const store = getPreferenceStore()
  const defaultValue = options?.defaultValue

  const read = (): T | undefined => {
    if (!key) return defaultValue
    const stored = store.get<T>(key)
    return stored === null ? defaultValue : stored
  }

  const value = ref<T | undefined>(read()) as Ref<T | undefined>
  const ready = ref<boolean>(!key)
  // The value `setValue`'s functional form receives, kept beside the ref.
  let currentValue = value.value

  if (!key) {
    ready.value = true
    value.value = defaultValue
    currentValue = defaultValue
  } else {
    let cancelled = false
    const sync = (): void => {
      if (!cancelled) {
        value.value = read()
        currentValue = value.value
      }
    }
    // Seed from whatever the store already knows, then let hydration converge
    // it. With a synchronous provider this is a no-op change.
    sync()
    ready.value = false
    const stop = store.subscribe(key, sync)
    void store.hydrate([key]).then(() => {
      if (cancelled) return
      sync()
      ready.value = true
    })
    if (getCurrentScope()) {
      onScopeDispose(() => {
        cancelled = true
        stop()
      })
    }
  }

  const setValue = (next: T | ((previous: T | undefined) => T)): void => {
    const resolved =
      typeof next === 'function' ? (next as (previous: T | undefined) => T)(currentValue) : next
    currentValue = resolved
    value.value = resolved
    if (key) store.set(key, resolved)
  }

  const removeValue = (): void => {
    currentValue = defaultValue
    value.value = defaultValue
    if (key) store.remove(key)
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
