/**
 * Google OAuth types for molecule.dev.
 *
 * @module
 */

export type {
  OAuthAuthorizeUrlBuilder,
  OAuthAuthorizeUrlParams,
  OAuthUserProps,
  OAuthVerifier,
} from '@molecule/api-oauth'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    /**
     * Process Env interface.
     */
    export interface ProcessEnv {
      /**
       * The Google OAuth client ID.
       *
       * @see https://developers.google.com/identity/protocols/oauth2/openid-connect
       */
      OAUTH_GOOGLE_CLIENT_ID?: string

      /**
       * The Google OAuth client secret.
       *
       * @see https://developers.google.com/identity/protocols/oauth2/openid-connect
       */
      OAUTH_GOOGLE_CLIENT_SECRET?: string

      /**
       * The app origin for OAuth redirect.
       */
      APP_ORIGIN?: string

      /**
       * Override for the Google authorization endpoint (OAuth initiation).
       * Defaults to `https://accounts.google.com/o/oauth2/v2/auth`.
       *
       * Pairs with `OAUTH_GOOGLE_TOKEN_URL` / `OAUTH_GOOGLE_USER_URL` for
       * proxy deployments or E2E mock OAuth servers.
       */
      OAUTH_GOOGLE_AUTHORIZE_URL?: string

      /**
       * Override for the Google access-token endpoint. Defaults to
       * `https://www.googleapis.com/oauth2/v4/token`.
       *
       * Use this to point the bond at an internal proxy or — most
       * commonly — an E2E mock OAuth server.
       */
      OAUTH_GOOGLE_TOKEN_URL?: string

      /**
       * Override for the Google userinfo endpoint. Defaults to
       * `https://www.googleapis.com/oauth2/v3/userinfo`.
       *
       * Pairs with `OAUTH_GOOGLE_TOKEN_URL` for proxy / E2E mock setups.
       */
      OAUTH_GOOGLE_USER_URL?: string
    }
  }
}
