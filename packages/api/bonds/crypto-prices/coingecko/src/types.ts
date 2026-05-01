/**
 * CoinGecko crypto-prices provider configuration types.
 *
 * @module
 */

/**
 * Configuration options for the CoinGecko crypto-prices provider.
 *
 * The CoinGecko public API
 * (`https://api.coingecko.com/api/v3`) is keyless and free for personal /
 * non-commercial use, so all fields are optional. Setting {@link apiKey}
 * switches the provider to the CoinGecko Pro endpoint
 * (`https://pro-api.coingecko.com/api/v3`) and authenticates with the
 * `x-cg-pro-api-key` header.
 */
export interface CoinGeckoCryptoPricesConfig {
  /**
   * Base URL override. Defaults to `'https://api.coingecko.com/api/v3'` when
   * {@link apiKey} is omitted, or `'https://pro-api.coingecko.com/api/v3'`
   * when {@link apiKey} is set.
   */
  baseUrl?: string

  /**
   * CoinGecko Pro API key. When set, the provider uses the Pro host and
   * sends the `x-cg-pro-api-key` header. The free public endpoint requires
   * no key.
   */
  apiKey?: string

  /**
   * Request timeout in milliseconds. Defaults to `10000`.
   */
  timeout?: number
}

/**
 * Stable error code emitted by the CoinGecko provider when the upstream API
 * returns HTTP 429 (Too Many Requests).
 *
 * Catch on this constant rather than parsing error messages — the message
 * text is for humans only.
 */
export const RATE_LIMITED = 'RATE_LIMITED'

/**
 * Error thrown by the CoinGecko provider when the upstream API rejects a
 * request with HTTP 429 (Too Many Requests).
 *
 * The error never includes the configured API key (or any other secret) in
 * its message or properties.
 */
export class CoinGeckoRateLimitedError extends Error {
  /**
   * Stable error code: always {@link RATE_LIMITED}.
   */
  public readonly code: typeof RATE_LIMITED = RATE_LIMITED

  /**
   * Suggested wait, in seconds, parsed from the upstream `Retry-After`
   * header. `null` when the header was absent or unparseable.
   */
  public readonly retryAfterSeconds: number | null

  /**
   * Constructs a new {@link CoinGeckoRateLimitedError}.
   *
   * @param message - Human-readable description of the rate-limit event.
   * @param retryAfterSeconds - Suggested wait before retrying, in seconds.
   */
  public constructor(message: string, retryAfterSeconds: number | null) {
    super(message)
    this.name = 'CoinGeckoRateLimitedError'
    this.retryAfterSeconds = retryAfterSeconds
  }
}
