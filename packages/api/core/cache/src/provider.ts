/**
 * Cache provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-cache-redis`) call `setProvider()` during setup.
 * Application code uses the convenience functions which delegate to the bonded provider.
 *
 * @module
 */

import { bond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { CacheOptions, CacheProvider } from './types.js'

const BOND_TYPE = 'cache'

/**
 * Registers a cache provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param provider - The cache provider implementation to bond.
 */
export const setProvider = (provider: CacheProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded cache provider, throwing if none is configured.
 *
 * @returns The bonded cache provider.
 * @throws {Error} If no cache provider has been bonded.
 */
export const getProvider = (): CacheProvider => {
  try {
    return bondRequire<CacheProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('cache.error.noProvider', undefined, {
        defaultValue: 'Cache provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether a cache provider is currently bonded.
 *
 * @returns `true` if a cache provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Retrieves a cached value by key, or `undefined` if not found or expired.
 *
 * @param key - The cache key to look up.
 * @returns The cached value cast to `T`, or `undefined` if not found.
 * @throws {Error} If no cache provider has been bonded.
 */
export const get = async <T = unknown>(key: string): Promise<T | undefined> => {
  return getProvider().get<T>(key)
}

/**
 * Stores a value in the cache under the given key, with optional TTL and tags.
 *
 * @param key - The cache key.
 * @param value - The value to store.
 * @param options - Optional TTL in seconds and tags for invalidation.
 * @returns A promise that resolves when the value has been stored.
 * @throws {Error} If no cache provider has been bonded.
 */
export const set = async <T = unknown>(
  key: string,
  value: T,
  options?: CacheOptions,
): Promise<void> => {
  return getProvider().set<T>(key, value, options)
}

/**
 * Deletes a cached value by key.
 *
 * @param key - The cache key to delete.
 * @returns `true` if the key existed and was deleted, `false` otherwise.
 * @throws {Error} If no cache provider has been bonded.
 */
export const del = async (key: string): Promise<boolean> => {
  return getProvider().delete(key)
}

/**
 * Checks whether a key exists in the cache.
 *
 * @param key - The cache key to check.
 * @returns `true` if the key exists in the cache.
 * @throws {Error} If no cache provider has been bonded.
 */
export const has = async (key: string): Promise<boolean> => {
  return getProvider().has(key)
}

/**
 * Cache-aside helper: returns the cached value if it exists, otherwise calls
 * the factory function, caches the result, and returns it. Uses the provider's
 * native `getOrSet` if available, otherwise falls back to a `get` + `set` sequence.
 *
 * @param key - The cache key.
 * @param factory - Async function that produces the value when cache misses.
 * @param options - Optional TTL and tags for the cached entry.
 * @returns The cached or freshly-computed value.
 * @throws {Error} If no cache provider has been bonded.
 */
export const getOrSet = async <T = unknown>(
  key: string,
  factory: () => Promise<T>,
  options?: CacheOptions,
): Promise<T> => {
  const provider = getProvider()

  // Use native getOrSet if available
  if (provider.getOrSet) {
    return provider.getOrSet<T>(key, factory, options)
  }

  // Fallback implementation
  const cached = await provider.get<T>(key)
  if (cached !== undefined) {
    return cached
  }

  const value = await factory()
  await provider.set<T>(key, value, options)
  return value
}
