/**
 * Result of a password breach check via the HIBP k-anonymity API.
 */
export interface BreachCheckResult {
  /**
   * Whether the password has appeared in any known breach corpus.
   */
  pwned: boolean

  /**
   * Number of times the password's SHA-1 hash has been observed in breaches.
   * Zero when the hash was not present in the API response.
   */
  count: number
}

/**
 * Options for {@link checkPassword}.
 */
export interface CheckPasswordOptions {
  /**
   * Custom `fetch` implementation. Defaults to the global `fetch`. Useful for
   * tests, custom retry/timeout logic, or running behind an HTTP proxy.
   */
  fetch?: typeof globalThis.fetch

  /**
   * Override the HIBP password range API endpoint. Defaults to
   * `https://api.pwnedpasswords.com/range`. Trailing slash optional.
   */
  apiUrl?: string

  /**
   * `User-Agent` header sent with the request. HIBP requires a descriptive
   * UA per their documentation. Defaults to `molecule-api-breach-check`.
   */
  userAgent?: string

  /**
   * When `true`, sends `Add-Padding: true` so the API returns padded results
   * to thwart traffic-analysis attacks. Defaults to `true` (privacy-safe).
   */
  padding?: boolean

  /**
   * Optional cache adapter. When provided, results for a given hash prefix
   * are cached and re-used on subsequent calls. Compatible with
   * `@molecule/api-cache` providers (any object with `get`/`set` returning
   * the prefix response body).
   */
  cache?: BreachCheckCache

  /**
   * TTL in milliseconds for cached entries. Defaults to 60_000 (1 minute).
   * Only applied when {@link CheckPasswordOptions.cache} is set.
   */
  cacheTtlMs?: number

  /**
   * Request timeout in milliseconds. Defaults to 5_000 (5 seconds).
   * Implemented via `AbortController`.
   */
  timeoutMs?: number
}

/**
 * Minimal cache contract — compatible with `@molecule/api-cache` providers.
 * Only `get`/`set` of string keys to string values is required.
 */
export interface BreachCheckCache {
  /**
   * Get a previously cached value, or `undefined` if not present.
   */
  get(key: string): Promise<string | undefined> | string | undefined

  /**
   * Set a value with an optional TTL in milliseconds.
   */
  set(key: string, value: string, ttlMs?: number): Promise<void> | void
}
