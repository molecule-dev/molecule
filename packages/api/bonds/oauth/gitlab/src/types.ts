/**
 * Type definitions for the GitLab OAuth provider.
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
       * The GitLab OAuth client ID.
       *
       * @see https://gitlab.com/oauth/applications
       */
      OAUTH_GITLAB_CLIENT_ID?: string

      /**
       * The GitLab OAuth client secret.
       *
       * @see https://gitlab.com/oauth/applications
       */
      OAUTH_GITLAB_CLIENT_SECRET?: string

      /**
       * The app origin for OAuth redirect.
       */
      APP_ORIGIN?: string
    }
  }
}
