/**
 * Open Food Facts nutrition-database provider configuration types.
 *
 * @module
 */

/**
 * Configuration options for the Open Food Facts nutrition-database
 * provider.
 *
 * The Open Food Facts public API
 * (`https://world.openfoodfacts.org`) is keyless and free for any use,
 * so all fields are optional. Open Food Facts ASKS callers to identify
 * themselves via a polite `User-Agent` of the form
 * `<app-name>/<version> (<contact-email-or-url>)` so abusive traffic can
 * be contacted before being blocked. Wire {@link userAgent} (or the
 * `OPEN_FOOD_FACTS_USER_AGENT` environment variable) when shipping to
 * production.
 *
 * @see https://openfoodfacts.github.io/openfoodfacts-server/api/#authentication
 */
export interface OpenFoodFactsConfig {
  /**
   * Base URL override. Defaults to `'https://world.openfoodfacts.org'`.
   *
   * Country-specific instances exist (e.g. `'https://us.openfoodfacts.org'`)
   * but they share the same product database — the `world` host is the
   * canonical entry point.
   */
  baseUrl?: string

  /**
   * Polite `User-Agent` header sent on every request. Open Food Facts
   * asks callers to identify themselves so abusive traffic can be
   * contacted before being blocked.
   *
   * Defaults to a generic `molecule.dev/1.0 (https://molecule.dev)` when
   * omitted; overrides should follow the form
   * `<app-name>/<version> (<contact-email-or-url>)`.
   */
  userAgent?: string

  /**
   * Request timeout in milliseconds. Defaults to `10000`.
   */
  timeout?: number
}

/**
 * Stable error code emitted by the Open Food Facts provider when the
 * upstream API returns HTTP 429 (Too Many Requests).
 *
 * Catch on this constant rather than parsing error messages — the message
 * text is for humans only.
 */
export const RATE_LIMITED = 'RATE_LIMITED'

/**
 * Error thrown by the Open Food Facts provider when the upstream API
 * rejects a request with HTTP 429 (Too Many Requests).
 */
export class OpenFoodFactsRateLimitedError extends Error {
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
   * Constructs a new {@link OpenFoodFactsRateLimitedError}.
   *
   * @param message - Human-readable description of the rate-limit event.
   * @param retryAfterSeconds - Suggested wait before retrying, in seconds.
   */
  public constructor(message: string, retryAfterSeconds: number | null) {
    super(message)
    this.name = 'OpenFoodFactsRateLimitedError'
    this.retryAfterSeconds = retryAfterSeconds
  }
}
