/**
 * Google OAuth types for molecule.dev.
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
    }
  }
}
