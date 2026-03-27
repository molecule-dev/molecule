/**
 * RateLimit provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete rate-limit implementation.
 *
 * @module
 */

/**
 *
 */
export interface RateLimitProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface RateLimitConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
