/**
 * Zoom video meetings provider configuration types.
 *
 * @module
 */

/**
 * Configuration for the Zoom video meetings provider.
 *
 * The provider supports two authentication modes:
 *
 * 1. **Server-to-Server OAuth** (recommended for backend services).
 *    Supply `accountId`, `clientId`, and `clientSecret`. The provider
 *    fetches and caches an account-level access token from
 *    `https://zoom.us/oauth/token` using the
 *    `account_credentials` grant.
 *
 * 2. **Per-request user OAuth tokens**. Supply a synchronous or
 *    asynchronous `accessToken` resolver. When set, this short-circuits
 *    the Server-to-Server flow on every request — useful for acting as
 *    individual end-users with their own consent.
 */
export interface ZoomVideoMeetingsConfig {
  /**
   * Zoom account id for the Server-to-Server OAuth app. Defaults to
   * `process.env.ZOOM_ACCOUNT_ID`.
   */
  accountId?: string

  /**
   * Zoom Server-to-Server OAuth client id. Defaults to
   * `process.env.ZOOM_CLIENT_ID`.
   */
  clientId?: string

  /**
   * Zoom Server-to-Server OAuth client secret. Defaults to
   * `process.env.ZOOM_CLIENT_SECRET`.
   */
  clientSecret?: string

  /**
   * Optional resolver for a user-OAuth access token. When provided,
   * each request uses the returned bearer token instead of fetching a
   * Server-to-Server account token.
   */
  accessToken?: () => string | Promise<string>

  /**
   * Override the Zoom API base URL. Useful for tests or proxies.
   * Defaults to `https://api.zoom.us/v2`.
   */
  baseUrl?: string

  /**
   * Override the Zoom OAuth token URL. Defaults to
   * `https://zoom.us/oauth/token`.
   */
  oauthUrl?: string

  /**
   * Optional `fetch` implementation. Defaults to the global `fetch` from
   * Node 20+. Tests may inject a mock here.
   */
  fetch?: typeof fetch

  /**
   * Optional clock function returning the current epoch milliseconds.
   * Defaults to `Date.now`. Useful for deterministic tests of token
   * expiry.
   */
  now?: () => number
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    /** Zoom-specific environment variable declarations. */
    export interface ProcessEnv {
      ZOOM_ACCOUNT_ID?: string
      ZOOM_CLIENT_ID?: string
      ZOOM_CLIENT_SECRET?: string
    }
  }
}
