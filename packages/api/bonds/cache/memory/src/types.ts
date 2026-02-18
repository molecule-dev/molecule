/**
 * Type definitions for the in-memory cache provider.
 *
 * @module
 */

export type { CacheOptions, CacheProvider } from '@molecule/api-cache'

/**
 * A cached entry with optional TTL and tags.
 */
export interface CacheEntry<T = unknown> {
  value: T
  expiresAt?: number
  tags?: string[]
}

/**
 * Options for creating an in-memory cache provider.
 */
export interface MemoryOptions {
  /**
   * Maximum number of entries to store (LRU eviction).
   */
  maxSize?: number

  /**
   * Default TTL in seconds.
   */
  defaultTtl?: number

  /**
   * Interval in ms for cleaning up expired entries.
   */
  cleanupInterval?: number
}
