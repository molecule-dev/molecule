/**
 * GitHub OAuth provider for molecule.dev.
 *
 * @example
 * ```typescript
 * import { createHash, randomBytes } from 'node:crypto'
 *
 * import { bond } from '@molecule/api-bond'
 * import type { OAuthProviderConfig } from '@molecule/api-oauth'
 * import { getAuthorizeUrl, serverName, verify } from '@molecule/api-oauth-github'
 *
 * // Startup: bond NAMED by serverName ('github'). Env: OAUTH_GITHUB_CLIENT_ID,
 * // OAUTH_GITHUB_CLIENT_SECRET (server only), APP_ORIGIN.
 * const github: OAuthProviderConfig = { serverName, verify, getAuthorizeUrl }
 * bond('oauth', serverName, github)
 *
 * // Initiation: fresh CSRF state + PKCE pair per request (keep both in httpOnly cookies).
 * const state = randomBytes(32).toString('hex')
 * const codeVerifier = randomBytes(32).toString('base64url')
 * const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
 * const redirectUri = process.env.APP_ORIGIN ?? 'https://app.example.com'
 * const authorizeUrl = getAuthorizeUrl({ state, codeChallenge, codeChallengeMethod: 'S256', redirectUri })
 * // → 302 the browser to authorizeUrl; null means OAUTH_GITHUB_CLIENT_ID is unset.
 *
 * // Callback (after checking the returned state equals the cookie): exchange server-side.
 * const user = await verify('code-from-callback-query', codeVerifier, redirectUri)
 * // user: { username: 'octocat@github', email, emailVerified, oauthServer: 'github', oauthId, ... }
 * // null → GitHub rejected the code (respond 403); a throw → network/config failure.
 * console.log(authorizeUrl, user?.username)
 * ```
 *
 * @remarks
 * - **Bond it NAMED: `bond('oauth', serverName, { serverName, verify,
 *   getAuthorizeUrl })`** — `@molecule/api-resource-user`'s OAuth handlers
 *   look providers up with `get('oauth', '<provider>')`; there is no
 *   `setProvider` and no default export.
 * - **`verify()` returns `null` for a rejected code** (GitHub answers HTTP 200
 *   with `bad_verification_code`) — only network/config failures throw.
 * - `emailVerified` is `true` only when GitHub returned a PUBLIC profile email
 *   (GitHub only allows verified addresses there). Users with a private email
 *   get `email: undefined` — the bond does NOT call `/user/emails`.
 * - Requested scopes are fixed to `read:user user:email`. GitHub Enterprise /
 *   mock servers: override `OAUTH_GITHUB_AUTHORIZE_URL`,
 *   `OAUTH_GITHUB_TOKEN_URL`, `OAUTH_GITHUB_USER_URL`.
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
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
