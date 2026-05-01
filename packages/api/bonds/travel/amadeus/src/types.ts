/**
 * Amadeus travel trip-planning provider configuration types and error
 * codes.
 *
 * @module
 */

/**
 * Configuration options for the Amadeus travel trip-planning provider.
 *
 * The bond reuses the SAME OAuth2 client-credentials flow as
 * `@molecule/api-flights-amadeus` and `@molecule/api-hotels-amadeus`:
 * a single `AMADEUS_CLIENT_ID` / `AMADEUS_CLIENT_SECRET` pair grants
 * access to flights, hotels, points-of-interest (used for activities)
 * and any other Self-Service product on the same account. There is no
 * cross-bond shared cache — each provider instance mints its own token
 * — but credentials are interchangeable.
 */
export interface AmadeusTravelConfig {
  /**
   * OAuth2 client ID, sent as the `client_id` form field when minting
   * a fresh access token.
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
   * environment variable. The secret is NEVER included in any error
   * message — token-mint failures redact it before bubbling up.
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
   * Request timeout in milliseconds for both the token-mint call and
   * the data-API calls. Defaults to `15000`.
   */
  timeout?: number

  /**
   * Number of seconds to subtract from the upstream `expires_in`
   * value before treating a cached token as stale. Defaults to `30`.
   */
  tokenSkewSeconds?: number
}

/**
 * Stable error code emitted by the Amadeus travel provider when neither
 * `clientId` nor `clientSecret` (nor their env-var fallbacks) are
 * configured.
 */
export const MISSING_CREDENTIALS = 'MISSING_CREDENTIALS' as const

/**
 * Stable error code emitted by the Amadeus travel provider when the
 * OAuth2 token-mint call fails.
 */
export const TOKEN_MINT_FAILED = 'TOKEN_MINT_FAILED' as const

/**
 * Stable error code emitted by the Amadeus travel provider for any
 * non-OK upstream HTTP response (including HTTP 429).
 */
export const UPSTREAM_ERROR = 'UPSTREAM_ERROR' as const

/**
 * Error thrown by the Amadeus travel provider when no client
 * credentials are configured.
 *
 * Never includes any credential value in its message or properties.
 */
export class AmadeusTravelMissingCredentialsError extends Error {
  /**
   * Stable error code: always {@link MISSING_CREDENTIALS}.
   */
  public readonly code: typeof MISSING_CREDENTIALS = MISSING_CREDENTIALS

  /**
   * Constructs a new {@link AmadeusTravelMissingCredentialsError}.
   */
  public constructor() {
    super(
      'Amadeus travel provider is missing client credentials. Set AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET, or pass clientId/clientSecret to createProvider().',
    )
    this.name = 'AmadeusTravelMissingCredentialsError'
  }
}

/**
 * Error thrown by the Amadeus travel provider when the OAuth2
 * token-mint call fails. The `client_secret` NEVER appears in this
 * error's message or properties.
 */
export class AmadeusTravelTokenMintError extends Error {
  /**
   * Stable error code: always {@link TOKEN_MINT_FAILED}.
   */
  public readonly code: typeof TOKEN_MINT_FAILED = TOKEN_MINT_FAILED

  /**
   * Upstream HTTP status code, when available.
   */
  public readonly status: number | null

  /**
   * Constructs a new {@link AmadeusTravelTokenMintError}.
   *
   * @param message - Human-readable description (never the secret).
   * @param status - Upstream HTTP status code, or `null` if unknown.
   */
  public constructor(message: string, status: number | null) {
    super(message)
    this.name = 'AmadeusTravelTokenMintError'
    this.status = status
  }
}

/**
 * Error thrown by the Amadeus travel provider for any non-OK upstream
 * data-API response. Never includes the OAuth secret.
 */
export class AmadeusTravelUpstreamError extends Error {
  /**
   * Stable error code: always {@link UPSTREAM_ERROR}.
   */
  public readonly code: typeof UPSTREAM_ERROR = UPSTREAM_ERROR

  /**
   * Upstream HTTP status code.
   */
  public readonly status: number

  /**
   * Constructs a new {@link AmadeusTravelUpstreamError}.
   *
   * @param status - Upstream HTTP status code.
   * @param detail - Optional sanitized detail string from the upstream
   *   error envelope.
   */
  public constructor(status: number, detail?: string) {
    super(
      detail
        ? `Amadeus API request failed with status ${String(status)}: ${detail}`
        : `Amadeus API request failed with status ${String(status)}`,
    )
    this.name = 'AmadeusTravelUpstreamError'
    this.status = status
  }
}
