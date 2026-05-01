/**
 * Amadeus hotels provider configuration types and error codes.
 *
 * @module
 */

/**
 * Configuration options for the Amadeus hotels provider.
 *
 * Amadeus exposes a single OAuth2 client-credentials flow that is shared
 * across all of its product APIs (flights, hotels, points-of-interest,
 * etc.). The same `AMADEUS_CLIENT_ID` / `AMADEUS_CLIENT_SECRET` env vars
 * therefore drive both `@molecule/api-flights-amadeus` and
 * `@molecule/api-hotels-amadeus`. Token caching is per-provider-instance
 * — there is no cross-bond shared cache, but the OAuth pattern is
 * identical so credentials work interchangeably.
 */
export interface AmadeusHotelsConfig {
  /**
   * OAuth2 client ID, sent as the `client_id` form field when minting a
   * fresh access token.
   *
   * If omitted, the provider falls back to the `AMADEUS_CLIENT_ID`
   * environment variable. Requests fail with a sanitized error if
   * neither is set.
   */
  clientId?: string

  /**
   * OAuth2 client secret, sent as the `client_secret` form field when
   * minting a fresh access token.
   *
   * If omitted, the provider falls back to the `AMADEUS_CLIENT_SECRET`
   * environment variable. The secret is NEVER included in error
   * messages — token-mint failures redact it before bubbling up.
   */
  clientSecret?: string

  /**
   * Base URL override. Defaults to the Amadeus production host
   * `'https://api.amadeus.com'`. Pass `'https://test.api.amadeus.com'`
   * for the free sandbox tier, or any proxy URL for self-hosted setups.
   */
  baseUrl?: string

  /**
   * Request timeout in milliseconds for both the token-mint call and the
   * data-API calls. Defaults to `10000`.
   */
  timeout?: number

  /**
   * Number of seconds to subtract from the upstream `expires_in` value
   * before treating a cached token as stale. Defaults to `30`. Lower
   * values reduce wasted token mints; higher values reduce the chance
   * of using a token that expires mid-request.
   */
  tokenSkewSeconds?: number
}

/**
 * Error code raised when a hotels-provider call is attempted with no
 * `AMADEUS_CLIENT_ID` and/or `AMADEUS_CLIENT_SECRET` configured (neither
 * via the config object nor via environment variables). Surfaced via
 * `Error.cause` so callers can distinguish it from upstream errors.
 */
export const MISSING_CREDENTIALS = 'MISSING_CREDENTIALS' as const

/**
 * Error code raised when the OAuth2 token-mint call fails (e.g. invalid
 * credentials, network error, non-2xx status). The error message NEVER
 * includes the raw `client_secret`.
 */
export const TOKEN_MINT_FAILED = 'TOKEN_MINT_FAILED' as const

/**
 * Error code raised when an Amadeus hotels data API call fails (e.g. a
 * non-2xx HTTP status, a structured `errors[]` body, etc.).
 */
export const UPSTREAM_ERROR = 'UPSTREAM_ERROR' as const

/**
 * Error code raised when {@link HotelsProvider.bookHotel} is called.
 * Amadeus's hotel-booking endpoint requires PCI-compliant card capture
 * and is not safely callable from a generic backend bond — callers
 * should use Amadeus's hosted checkout / "price the offer" flow
 * instead.
 */
export const BOOKING_NOT_SUPPORTED = 'BOOKING_NOT_SUPPORTED' as const
