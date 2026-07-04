/**
 * Type definitions for the GitHub OAuth provider.
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

      /**
       * Override for the GitHub access-token endpoint. Defaults to
       * `https://github.com/login/oauth/access_token`.
       *
       * Use this to point the bond at GitHub Enterprise, an internal proxy,
       * or — most commonly — an E2E mock OAuth server.
       */
      OAUTH_GITHUB_TOKEN_URL?: string

      /**
       * Override for the GitHub user-info endpoint. Defaults to
       * `https://api.github.com/user`.
       *
       * Pairs with `OAUTH_GITHUB_TOKEN_URL` for GitHub Enterprise / E2E
       * mock setups.
       */
      OAUTH_GITHUB_USER_URL?: string

      /**
       * Override for the GitHub authorization endpoint (OAuth initiation).
       * Defaults to `https://github.com/login/oauth/authorize`.
       *
       * Pairs with `OAUTH_GITHUB_TOKEN_URL` / `OAUTH_GITHUB_USER_URL` for
       * GitHub Enterprise deployments.
       */
      OAUTH_GITHUB_AUTHORIZE_URL?: string
    }
  }
}
