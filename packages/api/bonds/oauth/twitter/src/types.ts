/**
 * Twitter OAuth types for molecule.dev.
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
       * The Twitter OAuth client ID.
       *
       * @see https://developer.twitter.com/en/docs/authentication/oauth-2-0
       * @see https://developer.twitter.com/en/portal/projects-and-apps
       */
      OAUTH_TWITTER_CLIENT_ID?: string

      /**
       * The Twitter OAuth client secret.
       *
       * @see https://developer.twitter.com/en/docs/authentication/oauth-2-0
       * @see https://developer.twitter.com/en/portal/projects-and-apps
       */
      OAUTH_TWITTER_CLIENT_SECRET?: string

      /**
       * Override for the X (Twitter) authorization endpoint (OAuth
       * initiation). Defaults to `https://x.com/i/oauth2/authorize`.
       *
       * Use this to point the bond at an E2E mock OAuth server.
       */
      OAUTH_TWITTER_AUTHORIZE_URL?: string

      /**
       * The app origin for OAuth redirect.
       */
      APP_ORIGIN?: string
    }
  }
}
