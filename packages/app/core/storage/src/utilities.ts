/**
 * Convenience wrappers around the bonded storage provider.
 *
 * These delegate to the provider retrieved via `getProvider()`.
 *
 * @module
 */

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
 * @returns A promise that resolves when the value is stored.
 */
export const set = async <T = unknown>(key: string, value: T): Promise<void> => {
  return getProvider().set<T>(key, value)
}

/**
 * Removes a value from storage by key.
 *
 * @param key - The storage key to remove.
 * @returns A promise that resolves when the key is removed.
 */
export const remove = async (key: string): Promise<void> => {
  return getProvider().remove(key)
}

/**
 * Clears all values from storage.
 * @returns A promise that resolves when storage is cleared.
 */
export const clear = async (): Promise<void> => {
  return getProvider().clear()
}

/**
 * Returns all keys currently stored.
 *
 * @returns An array of storage keys.
 */
export const keys = async (): Promise<string[]> => {
  return getProvider().keys()
}
