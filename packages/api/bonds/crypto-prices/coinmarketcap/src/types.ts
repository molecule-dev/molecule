/**
 * CoinMarketCap crypto-prices provider configuration types.
 *
 * @module
 */

/**
 * Configuration options for the CoinMarketCap crypto-prices provider.
 *
 * The CoinMarketCap Pro API
 * (`https://pro-api.coinmarketcap.com/v1`) requires authentication, so
 * {@link apiKey} (or the `COINMARKETCAP_API_KEY` environment variable) must
 * be provided before any request is made. The key is sent in the
 * `X-CMC_PRO_API_KEY` header.
 */
export interface CoinMarketCapCryptoPricesConfig {
  /**
   * Base URL override. Defaults to `'https://pro-api.coinmarketcap.com/v1'`.
   */
  baseUrl?: string

  /**
   * CoinMarketCap Pro API key. Sent in the `X-CMC_PRO_API_KEY` header on
   * every request. The provider does not include the key in any error
   * messages.
   */
  apiKey?: string

  /**
   * Request timeout in milliseconds. Defaults to `10000`.
   */
  timeout?: number
}

/**
 * Stable error code emitted by the CoinMarketCap provider when the upstream
 * API returns HTTP 429 (Too Many Requests).
 *
 * Catch on this constant rather than parsing error messages — the message
 * text is for humans only.
 */
export const RATE_LIMITED = 'RATE_LIMITED'

/**
 * Error thrown by the CoinMarketCap provider when the upstream API rejects a
 * request with HTTP 429 (Too Many Requests).
 *
 * The error never includes the configured API key (or any other secret) in
 * its message or properties.
 */
export class CoinMarketCapRateLimitedError extends Error {
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
   * Constructs a new {@link CoinMarketCapRateLimitedError}.
   *
   * @param message - Human-readable description of the rate-limit event.
   * @param retryAfterSeconds - Suggested wait before retrying, in seconds.
   */
  public constructor(message: string, retryAfterSeconds: number | null) {
    super(message)
    this.name = 'CoinMarketCapRateLimitedError'
    this.retryAfterSeconds = retryAfterSeconds
  }
}
