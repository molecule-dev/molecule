/**
 * Type definitions for rate-limit core interface.
 *
 * @module
 */

/**
 * Configuration options for rate limiting.
 */
export interface RateLimitOptions {
  /** Time window in milliseconds. */
  windowMs: number

  /** Maximum number of requests allowed within the window. */
  max: number

  /** Optional prefix for rate limit keys (useful for namespacing). */
  keyPrefix?: string

  /**
   * If `true`, a request that ends in failure (final HTTP status `>= 400`) is not
   * counted against the limit — its consumed token is refunded once the response
   * completes. Honored ONLY by {@link createRateLimitMiddleware}, which observes
   * the response status; a direct `consume()` call cannot know the outcome, so it
   * never rolls anything back.
   */
  skipFailedRequests?: boolean

  /**
   * If `true`, a request that ends in success (final HTTP status `< 400`) is not
   * counted against the limit — its consumed token is refunded once the response
   * completes. Honored ONLY by {@link createRateLimitMiddleware}; a direct
   * `consume()` call cannot know the outcome.
   */
  skipSuccessfulRequests?: boolean
}

/**
 * Result of a rate limit check or consumption.
 */
export interface RateLimitResult {
  /** Whether the request is allowed. */
  allowed: boolean

  /** Number of requests remaining in the current window. */
  remaining: number

  /** Total requests allowed in the window. */
  total: number

  /** Date when the current window resets. */
  resetAt: Date

  /** Seconds until the client should retry (present only when `allowed` is `false`). */
  retryAfter?: number
}

/**
 * Rate limit provider interface.
 *
 * All rate limit providers must implement this interface.
 */
export interface RateLimitProvider {
  /**
   * Checks whether a request identified by `key` is within the rate limit
   * without consuming a token.
   *
   * @param key - Unique identifier for the rate limit bucket (e.g. IP, user ID).
   * @returns The current rate limit state for the key.
   */
  check(key: string): Promise<RateLimitResult>

  /**
   * Consumes one or more tokens from the rate limit bucket.
   *
   * @param key - Unique identifier for the rate limit bucket.
   * @param cost - Number of tokens to consume (defaults to 1).
   * @returns The updated rate limit state after consumption.
   */
  consume(key: string, cost?: number): Promise<RateLimitResult>

  /**
   * Resets the rate limit state for a given key.
   *
   * @param key - Unique identifier for the rate limit bucket to reset.
   */
  reset(key: string): Promise<void>

  /**
   * Returns the number of remaining tokens for a given key.
   *
   * @param key - Unique identifier for the rate limit bucket.
   * @returns Number of remaining requests in the current window.
   */
  getRemaining(key: string): Promise<number>

  /**
   * Refunds (un-consumes) previously consumed tokens for a key, rolling back a
   * prior {@link consume}. Used by {@link createRateLimitMiddleware} to honor
   * {@link RateLimitOptions.skipFailedRequests} /
   * {@link RateLimitOptions.skipSuccessfulRequests}: once the response status is
   * known, a request that should not count has its token rolled back.
   *
   * Providers refund the most recent consumption(s); the bucket never drops below
   * zero, and refunding an unknown/expired bucket (or a non-positive `cost`) is a
   * no-op.
   *
   * @param key - Unique identifier for the rate limit bucket.
   * @param cost - Number of tokens to refund (defaults to 1).
   */
  refund(key: string, cost?: number): Promise<void>

  /**
   * Applies new rate limit configuration to the provider.
   *
   * @param options - The rate limit options to apply.
   */
  configure(options: RateLimitOptions): void
}
