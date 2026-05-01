/**
 * Oura Ring wearable bond types for molecule.dev.
 *
 * @module
 */

import type {
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
       * The Oura OAuth client ID. Required to mint and refresh access
       * tokens.
       *
       * @see https://cloud.ouraring.com/docs/authentication
       */
      OAUTH_OURA_CLIENT_ID?: string

      /**
       * The Oura OAuth client secret. Required for the
       * `authorization_code` and `refresh_token` grant flows.
       *
       * @see https://cloud.ouraring.com/docs/authentication
       */
      OAUTH_OURA_CLIENT_SECRET?: string
    }
  }
}

/**
 * Configuration options for {@link createProvider}.
 */
export interface OuraProviderOptions {
  /**
   * OAuth client id. Defaults to `process.env.OAUTH_OURA_CLIENT_ID`.
   */
  clientId?: string
  /**
   * OAuth client secret. Defaults to
   * `process.env.OAUTH_OURA_CLIENT_SECRET`.
   */
  clientSecret?: string
  /**
   * OAuth redirect URI registered with the Oura application.
   */
  redirectUri: string
  /**
   * Persists user connections (access + refresh tokens). Required.
   */
  credentialsStore: WearableCredentialsStore
  /**
   * OAuth scopes to request when starting authorization. Defaults to the
   * union needed for daily activity, sleep, heart-rate, and personal
   * info reads.
   */
  scopes?: readonly string[]
  /**
   * Override the Oura Cloud API base URL. Defaults to
   * `https://api.ouraring.com/v2`.
   */
  apiBaseUrl?: string
  /**
   * Override the Oura OAuth authorize endpoint. Defaults to
   * `https://cloud.ouraring.com/oauth/authorize`.
   */
  authorizeUrl?: string
  /**
   * Override the Oura OAuth token endpoint. Defaults to
   * `https://api.ouraring.com/oauth/token`.
   */
  tokenUrl?: string
  /**
   * Override the Oura OAuth token-revoke endpoint. Defaults to
   * `https://api.ouraring.com/oauth/revoke`.
   */
  revokeUrl?: string
  /**
   * Request timeout in milliseconds. Defaults to `15_000`.
   */
  timeoutMs?: number
  /**
   * Optional override for the random-bytes generator used for the OAuth
   * `state` parameter. Tests inject a deterministic generator.
   */
  randomBytes?: (size: number) => Uint8Array
  /**
   * Optional clock override, primarily for tests. Defaults to `Date.now`.
   */
  now?: () => number
}

/**
 * Result of {@link OuraProvider.startAuthorize} — the URL the host
 * should redirect the user to plus the `state` value to round-trip.
 */
export interface OuraAuthorizeStart {
  /** Oura OAuth authorize URL. */
  url: string
  /** Opaque `state` value the host MUST verify on the callback. */
  state: string
}

/**
 * Public surface returned by {@link createProvider}. Extends the
 * stack-neutral {@link import('@molecule/api-wearable').WearableProvider}
 * with an Oura-flavored `startAuthorize()` helper for hosts that want
 * the bond to build the authorize URL.
 */
export interface OuraProvider extends WearableProviderType {
  /**
   * Builds the Oura authorize URL with a random `state` value. The host
   * is responsible for round-tripping `state` through the OAuth callback
   * and verifying it before calling {@link OuraProvider.connect}.
   *
   * @returns The URL to redirect to and the `state` value.
   */
  startAuthorize(): OuraAuthorizeStart
}
