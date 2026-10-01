/**
 * GitHub OAuth provider for molecule.dev.
 *
 * @remarks
 * - The token exchange (`verify`'s call to GitHub's token endpoint) is
 *   `application/x-www-form-urlencoded`, per RFC 6749 §4.1.3 — matching
 *   every other molecule.dev OAuth bond (google, gitlab, twitter, apple,
 *   microsoft). GitHub's endpoint also accepts JSON, but form-encoding is
 *   the spec-compliant, universally-supported choice.
 * - `verify` accepts a third `redirectUri` argument (falling back to
 *   `APP_ORIGIN`, same as the other bonds) and includes it in the token
 *   exchange. GitHub.com itself is lenient about a missing/mismatched
 *   `redirect_uri`, but a redirect_uri-enforcing GitHub Enterprise instance
 *   or strict proxy would otherwise reject the exchange with an error that
 *   looks unrelated to the missing parameter.
 *
 * @example
 * ```typescript
 * // npm install @molecule/api-oauth-github --workspace=api
 * // Env: OAUTH_GITHUB_CLIENT_ID, OAUTH_GITHUB_CLIENT_SECRET (server-only).
 * import { bond } from '@molecule/api-bond'
 * import { getAuthorizeUrl, serverName, verify } from '@molecule/api-oauth-github'
 *
 * // api/src/bonds/oauth-github.ts, called from setupBonds() — the `oauth`
 * // category is NAMED: providers coexist, and the bond name IS the
 * // serverName ('github').
 * bond('oauth', serverName, { serverName, verify, getAuthorizeUrl })
 *
 * // Redirect: register the app origin + each OAuth-starting page path
 * // (e.g. {origin} and {origin}/login) as the OAuth App's "Authorization
 * // callback URL"; the login button just links to GET /users/oauth/github.
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
