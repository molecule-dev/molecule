/**
 * Type definitions for the GitHub OAuth provider.
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
       * The GitHub OAuth client ID.
       *
       * @see https://github.com/settings/developers
       */
      OAUTH_GITHUB_CLIENT_ID?: string

      /**
       * The GitHub OAuth client secret.
       *
       * @see https://github.com/settings/developers
       */
      OAUTH_GITHUB_CLIENT_SECRET?: string
    }
  }
}
