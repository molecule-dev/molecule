/**
 * Type definitions for cache core interface.
 *
 * @module
 */

/**
 * Cache entry options.
 */
export interface CacheOptions {
  /**
   * Time-to-live in seconds.
   */
  ttl?: number

  /**
   * Tags for cache invalidation.
   */
  tags?: string[]
}

/**
 * Cache provider interface.
 *
 * All cache providers must implement this interface.
 */
export interface CacheProvider {
  /**
   * Gets a value from the cache.
   *
   * @param key - Cache key
   */
  get<T = unknown>(key: string): Promise<T | undefined>

  /**
   * Sets a value in the cache.
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param options - Cache options (ttl, tags)
   */
  set<T = unknown>(key: string, value: T, options?: CacheOptions): Promise<void>

  /**
   * Deletes a value from the cache.
   *
   * @param key - Cache key
   * @returns true if the key existed and was deleted
   */
  delete(key: string): Promise<boolean>

  /**
   * Checks if a key exists in the cache.
   *
   * @param key - Cache key
   */
  has(key: string): Promise<boolean>

  /**
   * Gets multiple values from the cache.
   *
   * @param keys - Array of cache keys
   */
  getMany?<T = unknown>(keys: string[]): Promise<Map<string, T>>

  /**
   * Sets multiple values in the cache.
   *
   * @param entries - Array of [key, value] pairs
   * @param options - Cache options applied to all entries
   */
  setMany?<T = unknown>(entries: Array<[string, T]>, options?: CacheOptions): Promise<void>

  /**
   * Deletes multiple values from the cache.
   *
   * @param keys - Array of cache keys
   */
  deleteMany?(keys: string[]): Promise<number>

  /**
   * Invalidates all cache entries with the given tag.
   *
   * @param tag - Tag to invalidate
   */
  invalidateTag?(tag: string): Promise<void>

  /**
   * Clears all cache entries.
   */
  clear?(): Promise<void>

  /**
   * Closes the cache connection.
   */
  close?(): Promise<void>

  /**
   * Gets or sets a value using a factory function.
   *
   * @param key - Cache key
   * @param factory - Function to generate the value if not cached
   * @param options - Cache options
   */
  getOrSet?<T = unknown>(key: string, factory: () => Promise<T>, options?: CacheOptions): Promise<T>
}
