/**
 * Type definitions for the GitLab OAuth provider.
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

      /**
       * Override for the GitLab access-token endpoint. Defaults to
       * `https://gitlab.com/oauth/token`.
       *
       * Use this to point the bond at a self-managed GitLab instance, an
       * internal proxy, or — most commonly — an E2E mock OAuth server.
       */
      OAUTH_GITLAB_TOKEN_URL?: string

      /**
       * Override for the GitLab user-info endpoint. Defaults to
       * `https://gitlab.com/api/v4/user`.
       *
       * Pairs with `OAUTH_GITLAB_TOKEN_URL` for self-managed GitLab / E2E
       * mock setups.
       */
      OAUTH_GITLAB_USER_URL?: string

      /**
       * Override for the GitLab authorization endpoint (OAuth initiation).
       * Defaults to `https://gitlab.com/oauth/authorize`.
       *
       * Pairs with `OAUTH_GITLAB_TOKEN_URL` / `OAUTH_GITLAB_USER_URL` for
       * self-managed GitLab deployments.
       */
      OAUTH_GITLAB_AUTHORIZE_URL?: string
    }
  }
}
