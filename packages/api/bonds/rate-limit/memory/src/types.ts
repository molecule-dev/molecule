/**
 * Internal types for the in-memory rate limit provider.
 *
 * @module
 */

/**
 * A single rate limit bucket entry tracking token consumption within a window.
 */
export interface MemoryBucket {
  /** Number of tokens consumed in the current window. */
  consumed: number

  /** Timestamp (ms since epoch) when the current window started. */
  windowStart: number
}
