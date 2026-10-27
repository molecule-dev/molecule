/**
 * Convenience wrappers around the bonded storage provider.
 *
 * These delegate to the provider retrieved via `getProvider()`.
 *
 * A write made here does NOT go through the preference store's own write path,
 * so it keeps the render-time snapshot coherent explicitly: after the provider
 * settles, the key is re-read through `getPreferenceStore().refresh()`. A
 * component reading the same key through the store therefore observes this
 * write instead of the value it had cached before it.
 *
 * @module
 */

import { getPreferenceStore } from './preferences.js'
import { getProvider } from './provider.js'

/**
 * Gets a value from storage by key.
 *
 * @param key - The storage key to look up.
 * @returns The stored value, or `null` if not found.
 */
export const get = async <T = unknown>(key: string): Promise<T | null> => {
  return getProvider().get<T>(key)
}

/**
 * Sets a value in storage.
 *
 * @param key - The storage key.
 * @param value - The value to store.
 * @returns A promise that resolves when the value is stored and the preference
 *   snapshot for the key has been refreshed.
 */
export const set = async <T = unknown>(key: string, value: T): Promise<void> => {
  await getProvider().set<T>(key, value)
  await getPreferenceStore().refresh(key)
}

/**
 * Removes a value from storage by key.
 *
 * @param key - The storage key to remove.
 * @returns A promise that resolves when the key is removed and the preference
 *   snapshot for it has been refreshed.
 */
export const remove = async (key: string): Promise<void> => {
  await getProvider().remove(key)
  await getPreferenceStore().refresh(key)
}

/**
 * Clears all values from storage.
 * @returns A promise that resolves when storage is cleared and every key the
 *   preference store holds a snapshot for has been re-read.
 */
export const clear = async (): Promise<void> => {
  await getProvider().clear()
  await getPreferenceStore().refresh()
}

/**
 * Returns all keys currently stored.
 *
 * @returns An array of storage keys.
 */
export const keys = async (): Promise<string[]> => {
  return getProvider().keys()
}
