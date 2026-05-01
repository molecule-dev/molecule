/**
 * Polygon.io equity-prices provider configuration types.
 *
 * @module
 */

/**
 * Configuration options for the Polygon.io equity-prices provider.
 *
 * Polygon requires an API key (`POLYGON_API_KEY`) sent as the `apiKey`
 * query parameter on every request. The free tier supports all five
 * endpoints used by this provider but caps requests at 5/minute and
 * delivers end-of-day data only for non-paid plans.
 */
export interface PolygonEquityPricesConfig {
  /**
   * API key, sent as the `apiKey` query parameter on every request.
   *
   * If omitted, the provider falls back to the `POLYGON_API_KEY`
   * environment variable. Requests will fail with a descriptive (and
   * sanitized) error if neither is set.
   */
  apiKey?: string

  /**
   * Base URL override. Defaults to `'https://api.polygon.io'`. Useful for
   * self-hosted / proxy deployments and for testing.
   */
  baseUrl?: string

  /**
   * Request timeout in milliseconds. Defaults to `10000`.
   */
  timeout?: number
}

/**
 * Error code raised when Polygon.io's rate limit is exceeded (HTTP 429).
 * Surfaced via `Error.cause` on rate-limit failures so callers can handle
 * them distinctly from generic upstream errors. When Polygon includes a
 * `Retry-After` response header, its parsed value (in seconds) is
 * attached to `Error.cause.retryAfterSeconds`.
 */
export const RATE_LIMITED = 'RATE_LIMITED' as const

/**
 * Error code raised when the Polygon.io API key is missing (neither the
 * config object nor the `POLYGON_API_KEY` environment variable provided
 * one).
 */
export const MISSING_API_KEY = 'MISSING_API_KEY' as const

/**
 * Error code raised when Polygon.io returns an unexpected payload (no
 * results block, missing required fields, or a non-OK HTTP status that
 * isn't a rate-limit response).
 */
export const UPSTREAM_ERROR = 'UPSTREAM_ERROR' as const
