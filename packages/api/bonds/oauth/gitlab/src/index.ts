/**
 * GitLab OAuth provider for molecule.dev.
 *
 * @example
 * ```typescript
 * import { createHash, randomBytes } from 'node:crypto'
 *
 * import { bond } from '@molecule/api-bond'
 * import type { OAuthProviderConfig } from '@molecule/api-oauth'
 * import { getAuthorizeUrl, serverName, verify } from '@molecule/api-oauth-gitlab'
 *
 * // Startup: bond NAMED by serverName ('gitlab'). Env: OAUTH_GITLAB_CLIENT_ID,
 * // OAUTH_GITLAB_CLIENT_SECRET (server only), APP_ORIGIN.
 * const gitlab: OAuthProviderConfig = { serverName, verify, getAuthorizeUrl }
 * bond('oauth', serverName, gitlab)
 *
 * // Initiation: fresh CSRF state + PKCE pair per request (keep both in httpOnly cookies).
 * const state = randomBytes(32).toString('hex')
 * const codeVerifier = randomBytes(32).toString('base64url')
 * const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
 * const redirectUri = process.env.APP_ORIGIN ?? 'https://app.example.com'
 * const authorizeUrl = getAuthorizeUrl({ state, codeChallenge, codeChallengeMethod: 'S256', redirectUri })
 * // → 302 the browser to authorizeUrl; null means OAUTH_GITLAB_CLIENT_ID is unset.
 *
 * // Callback (after checking the returned state equals the cookie): exchange server-side.
 * const user = await verify('code-from-callback-query', codeVerifier, redirectUri)
 * // user: { username: 'ada@gitlab', email, emailVerified, oauthServer: 'gitlab', oauthId, ... }
 * // null → GitLab rejected the code (respond 403); a throw → network/config failure.
 * console.log(authorizeUrl, user?.username)
 * ```
 *
 * @remarks
 * - **Bond it NAMED: `bond('oauth', serverName, { serverName, verify,
 *   getAuthorizeUrl })`** — there is no `setProvider` and no default export.
 * - **`verify()` returns `null` for a rejected code** (`invalid_grant` or a
 *   token response without `access_token`) — only network/config failures
 *   throw. Pass the SAME `redirectUri` you used for the authorize URL.
 * - Scope is fixed to `read_user`. `emailVerified` is `true` only when GitLab
 *   returned an email AND the account has `confirmed_at`.
 * - Self-managed GitLab / mock servers: override `OAUTH_GITLAB_AUTHORIZE_URL`,
 *   `OAUTH_GITLAB_TOKEN_URL`, `OAUTH_GITLAB_USER_URL` (defaults are gitlab.com).
 * - The token exchange (`verify`'s call to GitLab's Doorkeeper token endpoint)
 * is `application/x-www-form-urlencoded`, per RFC 6749 §4.1.3 — matching
 * every other molecule.dev OAuth bond (google, twitter, github, apple,
 * microsoft).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
