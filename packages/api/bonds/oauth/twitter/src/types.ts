/**
 * Twitter OAuth types for molecule.dev.
 *
 * @module
 */

export type { OAuthUserProps, OAuthVerifier } from '@molecule/api-oauth'

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
       * The app origin for OAuth redirect.
       */
      APP_ORIGIN?: string
    }
  }
}
