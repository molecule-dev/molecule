/**
 * Vue composable for storage.
 *
 * @module
 */

import { inject, onMounted, type Ref, ref } from 'vue'

import type { StorageProvider } from '@molecule/app-storage'

import { StorageKey } from '../injection-keys.js'
import type { UseStorageValueReturn } from '../types.js'

/**
 * Composable to access the storage provider from injection.
 *
 * @returns The storage provider
 * @throws {Error} Error if used without providing storage
 */
export function useStorageProvider(): StorageProvider {
  const provider = inject(StorageKey)
  if (!provider) {
    throw new Error('useStorageProvider requires StorageProvider to be provided')
  }
  return provider
}

/**
 * Options for useStorageValue composable.
 */
export interface UseStorageValueOptions<T> {
  defaultValue?: T
}

/**
 * Composable to manage a single storage value with Vue reactivity.
 *
 * @param key - Storage key
 * @param options - Composable options
 * @returns Value, setter, and loading state
 *
 * @example
 * ```vue
 * <script setup>
 * import { useStorageValue } from '`@molecule/app-vue`'
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
  const { defaultValue } = options ?? {}

  // Reactive state
  const value = ref<T | undefined>(defaultValue) as Ref<T | undefined>
  const loading = ref(true)
  const error = ref<Error | null>(null)

  // Load initial value
  onMounted(async () => {
    try {
      const stored = await storage.get<T>(key)
      value.value = stored ?? defaultValue
      loading.value = false
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      loading.value = false
    }
  })

  const setValue = async (newValue: T): Promise<void> => {
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
    try {
      await storage.remove(key)
      value.value = defaultValue
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
