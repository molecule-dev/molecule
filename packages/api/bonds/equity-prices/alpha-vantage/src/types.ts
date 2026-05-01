/**
 * Alpha Vantage equity-prices provider configuration types.
 *
 * @module
 */

/**
 * Configuration options for the Alpha Vantage equity-prices provider.
 *
 * Alpha Vantage requires a free API key (`ALPHA_VANTAGE_API_KEY`) which is
 * sent as the `apikey` query parameter on every request.
 */
export interface AlphaVantageEquityPricesConfig {
  /**
   * API key, sent as the `apikey` query parameter on every request.
   *
   * If omitted, the provider falls back to the `ALPHA_VANTAGE_API_KEY`
   * environment variable. Requests will fail with a descriptive (and
   * sanitized) error if neither is set.
   */
  apiKey?: string

  /**
   * Base URL override. Defaults to `'https://www.alphavantage.co'`. Useful
   * for self-hosted / proxy deployments and for testing.
   */
  baseUrl?: string

  /**
   * Request timeout in milliseconds. Defaults to `10000`.
   */
  timeout?: number
}

/**
 * Error code raised when Alpha Vantage's free-tier rate limit (5 req/min /
 * 500 req/day) is exceeded. Surfaced via `Error.cause` on rate-limit
 * failures so callers can handle them distinctly from generic upstream
 * errors.
 */
export const RATE_LIMITED = 'RATE_LIMITED' as const

/**
 * Error code raised when the Alpha Vantage API key is missing (neither the
 * config object nor the `ALPHA_VANTAGE_API_KEY` environment variable
 * provided one).
 */
export const MISSING_API_KEY = 'MISSING_API_KEY' as const

/**
 * Error code raised when Alpha Vantage returns a body whose JSON shape
 * indicates an upstream error (e.g. invalid symbol, unknown function).
 */
export const UPSTREAM_ERROR = 'UPSTREAM_ERROR' as const
