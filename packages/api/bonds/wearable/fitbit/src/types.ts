/**
 * Fitbit wearable bond types for molecule.dev.
 *
 * @module
 */

import type {
  UserConnection as WearableUserConnection,
  WearableCredentialsStore,
  WearableProvider as WearableProviderType,
} from '@molecule/api-wearable'

export type {
  DailyActivity,
  HeartRateSummary,
  HeartRateZone,
  SleepSession,
  SleepStage,
  SleepStageSegment,
  SleepStageSummary,
  UserConnection,
  WearableCredentialsStore,
  WearableDate,
  WearableDateRange,
  WearableProvider,
  WeightEntry,
} from '@molecule/api-wearable'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    /**
     * Process Env interface.
     */
    export interface ProcessEnv {
      /**
       * The Fitbit OAuth client ID. Required to mint and refresh access
       * tokens. Treated as a public identifier — sent in `client_id`
       * during PKCE — but still configured as a secret for symmetry.
       *
       * @see https://dev.fitbit.com/build/reference/web-api/authorization/
       */
      OAUTH_FITBIT_CLIENT_ID?: string

      /**
       * The Fitbit OAuth client secret. Required for confidential-client
       * apps to refresh tokens via Basic auth. PKCE-only public clients
       * may omit it (the bond falls back to the PKCE-only token call when
       * absent).
       *
       * @see https://dev.fitbit.com/build/reference/web-api/authorization/
       */
      OAUTH_FITBIT_CLIENT_SECRET?: string
    }
  }
}

/**
 * Cache of `code_verifier` strings keyed by the in-flight authorization
 * `code` string they were paired with.
 *
 * The Fitbit OAuth callback hands the bond an authorization `code` but
 * not the `code_verifier` it was created with — the bond needs to store
 * the verifier between {@link FitbitProvider.startAuthorize} and
 * {@link FitbitProvider.connect}. The store contract leaves the choice
 * of backing storage (Redis, Postgres, in-memory for tests) to the host.
 */
export interface FitbitCodeVerifierStore {
  /**
   * Persists the verifier indexed by the `state` value the bond will
   * round-trip through Fitbit's authorize redirect.
   *
   * @param state - Opaque CSRF-protection token returned in the redirect.
   * @param verifier - The PKCE `code_verifier` to retrieve later.
   */
  put(state: string, verifier: string): Promise<void>
  /**
   * Retrieves and deletes the verifier associated with `state`.
   * Implementations MUST delete on read so a verifier is never reused.
   *
   * @param state - The `state` value extracted from the OAuth callback.
   * @returns The verifier, or `null` if no entry exists.
   */
  take(state: string): Promise<string | null>
}

/**
 * Configuration options for {@link createProvider}.
 */
export interface FitbitProviderOptions {
  /**
   * OAuth client id. Defaults to `process.env.OAUTH_FITBIT_CLIENT_ID`.
   */
  clientId?: string
  /**
   * OAuth client secret. Defaults to
   * `process.env.OAUTH_FITBIT_CLIENT_SECRET`. Optional — PKCE-only public
   * clients omit it.
   */
  clientSecret?: string
  /**
   * OAuth redirect URI registered with the Fitbit application. Required
   * to complete the authorization-code exchange.
   */
  redirectUri: string
  /**
   * Persists user connections (access + refresh tokens). Required.
   */
  credentialsStore: WearableCredentialsStore
  /**
   * Optional store for PKCE `code_verifier` strings keyed by `state`.
   * Required if the bond's `startAuthorize` / `connect` helpers are used
   * to drive the OAuth flow; the host may omit it when wiring the OAuth
   * exchange themselves.
   */
  codeVerifierStore?: FitbitCodeVerifierStore
  /**
   * OAuth scopes to request when starting authorization. Defaults to the
   * union needed for activity, sleep, heart-rate, and weight reads.
   */
  scopes?: readonly string[]
  /**
   * Override the Fitbit Web API base URL. Defaults to
   * `https://api.fitbit.com/1`.
   */
  apiBaseUrl?: string
  /**
   * Override the Fitbit OAuth authorize endpoint. Defaults to
   * `https://www.fitbit.com/oauth2/authorize`.
   */
  authorizeUrl?: string
  /**
   * Override the Fitbit OAuth token endpoint. Defaults to
   * `https://api.fitbit.com/oauth2/token`.
   */
  tokenUrl?: string
  /**
   * Override the Fitbit OAuth token-revoke endpoint. Defaults to
   * `https://api.fitbit.com/oauth2/revoke`.
   */
  revokeUrl?: string
  /**
   * Request timeout in milliseconds. Defaults to `15_000`.
   */
  timeoutMs?: number
  /**
   * Optional override for the random-bytes generator used by PKCE / CSRF.
   * Tests inject a deterministic generator.
   */
  randomBytes?: (size: number) => Uint8Array
  /**
   * Optional clock override, primarily for tests. Defaults to `Date.now`.
   */
  now?: () => number
}

/**
 * Result of {@link FitbitProvider.startAuthorize} — the URL the host
 * should redirect the user to plus the `state` value to round-trip.
 */
export interface FitbitAuthorizeStart {
  /** Fitbit OAuth authorize URL. */
  url: string
  /** Opaque `state` value the host MUST verify on the callback. */
  state: string
}

/**
 * Public surface returned by {@link createProvider}. Extends the
 * stack-neutral {@link import('@molecule/api-wearable').WearableProvider}
 * with Fitbit-specific OAuth-flow helpers.
 */
export interface FitbitProvider extends WearableProviderType {
  /**
   * Builds the Fitbit authorize URL and persists a fresh PKCE verifier.
   *
   * @returns The URL to redirect to and the round-trip `state` value.
   */
  startAuthorize(): Promise<FitbitAuthorizeStart>
  /**
   * Performs the authorization-code → token exchange with an explicit
   * PKCE `code_verifier`. Use this when the host wires the OAuth flow
   * itself (no `codeVerifierStore` configured).
   *
   * @param userId - Host-app user identifier.
   * @param code - OAuth authorization `code` from the redirect callback.
   * @param verifier - The PKCE `code_verifier` used to derive the challenge.
   * @returns The freshly-minted user connection (already persisted).
   */
  connectWithVerifier(
    userId: string,
    code: string,
    verifier: string,
  ): Promise<WearableUserConnection>
}
