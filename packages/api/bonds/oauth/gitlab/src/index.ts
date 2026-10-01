/**
 * GitLab OAuth provider for molecule.dev.
 *
 * @remarks
 * The token exchange (`verify`'s call to GitLab's Doorkeeper token endpoint)
 * is `application/x-www-form-urlencoded`, per RFC 6749 §4.1.3 — matching
 * every other molecule.dev OAuth bond (google, twitter, github, apple,
 * microsoft).
 *
 * @example
 * ```typescript
 * // npm install @molecule/api-oauth-gitlab --workspace=api
 * // Env: OAUTH_GITLAB_CLIENT_ID, OAUTH_GITLAB_CLIENT_SECRET (server-only).
 * import { bond } from '@molecule/api-bond'
 * import { getAuthorizeUrl, serverName, verify } from '@molecule/api-oauth-gitlab'
 *
 * // api/src/bonds/oauth-gitlab.ts, called from setupBonds() — the `oauth`
 * // category is NAMED: providers coexist, and the bond name IS the
 * // serverName ('gitlab').
 * bond('oauth', serverName, { serverName, verify, getAuthorizeUrl })
 *
 * // Redirect: register the app origin + each OAuth-starting page path
 * // (e.g. {origin} and {origin}/login) as the app's callback/redirect URL;
 * // the login button just links to GET /users/oauth/gitlab.
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
