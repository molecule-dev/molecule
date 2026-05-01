/**
 * IEX Cloud equity-prices provider configuration types.
 *
 * @module
 */

/**
 * Configuration options for the IEX Cloud equity-prices provider.
 *
 * IEX Cloud requires an API token (`IEX_API_KEY`) which is sent as the
 * `token` query parameter on every request.
 */
export interface IexEquityPricesConfig {
  /**
   * API key, sent as the `token` query parameter on every request.
   *
   * If omitted, the provider falls back to the `IEX_API_KEY` environment
   * variable. Requests will fail with a descriptive (and sanitized) error
   * if neither is set.
   */
  apiKey?: string

  /**
   * Base URL override. Defaults to `'https://cloud.iexapis.com/stable'`.
   * Useful for sandbox (`'https://sandbox.iexapis.com/stable'`),
   * self-hosted proxies, and testing.
   */
  baseUrl?: string

  /**
   * Request timeout in milliseconds. Defaults to `10000`.
   */
  timeout?: number
}

/**
 * Error code raised when IEX Cloud signals that the configured plan has
 * exhausted its message quota or that payment is required (HTTP `402 Payment
 * Required`). Surfaced via `Error.cause` so callers can handle it distinctly
 * from generic upstream errors and back-off / disable equity features
 * without leaking the API key.
 */
export const RATE_LIMITED = 'RATE_LIMITED' as const

/**
 * Error code raised when the IEX Cloud API key is missing (neither the
 * config object nor the `IEX_API_KEY` environment variable provided one).
 */
export const MISSING_API_KEY = 'MISSING_API_KEY' as const

/**
 * Error code raised when IEX Cloud returns a non-OK HTTP status (other than
 * `402`) or a body whose JSON shape indicates an upstream error.
 */
export const UPSTREAM_ERROR = 'UPSTREAM_ERROR' as const
