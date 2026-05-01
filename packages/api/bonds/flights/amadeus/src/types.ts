/**
 * Amadeus flights provider configuration types.
 *
 * @module
 */

/**
 * Configuration options for the Amadeus flights provider.
 *
 * Amadeus exposes a free Self-Service "test" environment at
 * `https://test.api.amadeus.com` (sandbox data, generous rate limits) and a
 * paid production environment at `https://api.amadeus.com`. Set
 * {@link useProduction} (or `AMADEUS_USE_PRODUCTION=true` env var) to
 * switch.
 */
export interface AmadeusFlightsConfig {
  /**
   * Amadeus API client id (a.k.a. API Key). Falls back to
   * `AMADEUS_CLIENT_ID` env var if omitted.
   */
  clientId?: string

  /**
   * Amadeus API client secret. Falls back to `AMADEUS_CLIENT_SECRET` env
   * var if omitted.
   */
  clientSecret?: string

  /**
   * When `true`, routes requests to the production endpoint
   * (`https://api.amadeus.com`). When `false` or omitted, uses the
   * Self-Service test sandbox (`https://test.api.amadeus.com`).
   */
  useProduction?: boolean

  /**
   * Base URL override. Takes precedence over {@link useProduction}.
   */
  baseUrl?: string

  /**
   * Request timeout in milliseconds. Defaults to `15000`.
   */
  timeout?: number

  /**
   * Maximum number of recently-searched offers to retain in memory for
   * subsequent `getOffer` / `priceOffer` calls. Amadeus requires the
   * original offer payload (not just its id) when pricing, so the
   * provider caches offers by id. Defaults to `1000`.
   */
  offerCacheSize?: number
}

/**
 * Stable error code emitted by the Amadeus provider when the upstream API
 * returns HTTP 429 (Too Many Requests).
 *
 * Catch on this constant rather than parsing error messages — the message
 * text is for humans only.
 */
export const RATE_LIMITED = 'RATE_LIMITED'

/**
 * Stable error code emitted by the Amadeus provider when neither
 * `clientId` nor `clientSecret` (nor their env-var fallbacks) are
 * configured.
 */
export const MISSING_CREDENTIALS = 'MISSING_CREDENTIALS'

/**
 * Stable error code emitted by the Amadeus provider when an offer id is
 * passed to `getOffer` / `priceOffer` that the provider has not previously
 * returned from `searchFlights`. Amadeus requires the original offer
 * payload to price; consumers MUST `searchFlights` before
 * `getOffer`/`priceOffer`.
 */
export const UNKNOWN_OFFER = 'UNKNOWN_OFFER'

/**
 * Stable error code emitted by the Amadeus provider for any other non-OK
 * upstream HTTP response.
 */
export const UPSTREAM_ERROR = 'UPSTREAM_ERROR'

/**
 * Error thrown by the Amadeus provider when the upstream API rejects a
 * request with HTTP 429 (Too Many Requests).
 *
 * The error never includes the configured client id / secret in its
 * message or properties.
 */
export class AmadeusRateLimitedError extends Error {
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
   * Constructs a new {@link AmadeusRateLimitedError}.
   *
   * @param message - Human-readable description of the rate-limit event.
   * @param retryAfterSeconds - Suggested wait before retrying, in seconds.
   */
  public constructor(message: string, retryAfterSeconds: number | null) {
    super(message)
    this.name = 'AmadeusRateLimitedError'
    this.retryAfterSeconds = retryAfterSeconds
  }
}

/**
 * Error thrown by the Amadeus provider when no client credentials are
 * configured.
 *
 * Never includes any credential value in its message or properties.
 */
export class AmadeusMissingCredentialsError extends Error {
  /**
   * Stable error code: always {@link MISSING_CREDENTIALS}.
   */
  public readonly code: typeof MISSING_CREDENTIALS = MISSING_CREDENTIALS

  /**
   * Constructs a new {@link AmadeusMissingCredentialsError}.
   */
  public constructor() {
    super(
      'Amadeus provider is missing client credentials. Set AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET, or pass clientId/clientSecret to createProvider().',
    )
    this.name = 'AmadeusMissingCredentialsError'
  }
}

/**
 * Error thrown by the Amadeus provider when an offer id is passed to
 * `getOffer` / `priceOffer` that has not previously been returned from
 * `searchFlights`.
 */
export class AmadeusUnknownOfferError extends Error {
  /**
   * Stable error code: always {@link UNKNOWN_OFFER}.
   */
  public readonly code: typeof UNKNOWN_OFFER = UNKNOWN_OFFER

  /**
   * The unknown offer id.
   */
  public readonly offerId: string

  /**
   * Constructs a new {@link AmadeusUnknownOfferError}.
   *
   * @param offerId - The offer id that was not found in the cache.
   */
  public constructor(offerId: string) {
    super(
      `Amadeus offer '${offerId}' is not in the local cache. Call searchFlights() before getOffer()/priceOffer().`,
    )
    this.name = 'AmadeusUnknownOfferError'
    this.offerId = offerId
  }
}

/**
 * Error thrown by the Amadeus provider for any other non-OK upstream
 * HTTP response.
 *
 * Never includes the configured client id / secret in its message or
 * properties.
 */
export class AmadeusUpstreamError extends Error {
  /**
   * Stable error code: always {@link UPSTREAM_ERROR}.
   */
  public readonly code: typeof UPSTREAM_ERROR = UPSTREAM_ERROR

  /**
   * Upstream HTTP status code.
   */
  public readonly status: number

  /**
   * Constructs a new {@link AmadeusUpstreamError}.
   *
   * @param status - Upstream HTTP status code.
   */
  public constructor(status: number) {
    super(`Amadeus API request failed with status ${String(status)}`)
    this.name = 'AmadeusUpstreamError'
    this.status = status
  }
}
