/**
 * Sign in with Apple OAuth provider for molecule.dev.
 *
 * ## Setup
 *
 * 1. Enroll in the [Apple Developer Program](https://developer.apple.com/programs/).
 *
 * 2. In the [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list)
 *    console, create:
 *
 *    - An **App ID** with the *Sign in with Apple* capability enabled.
 *    - A **Services ID** whose identifier becomes your `OAUTH_APPLE_CLIENT_ID`.
 *      Configure its *Sign in with Apple* settings with your domain and the
 *      exact redirect URI(s) you will use (e.g. `https://yourapp.com/auth/apple/callback`).
 *    - A **Key** with *Sign in with Apple* enabled. Download the resulting
 *      `.p8` file once (Apple does not allow re-download). The 10-character
 *      Key ID becomes `OAUTH_APPLE_KEY_ID`; the file's contents become
 *      `OAUTH_APPLE_PRIVATE_KEY`.
 *
 * 3. Locate your **Team ID** at the top right of the developer console;
 *    set it to `OAUTH_APPLE_TEAM_ID`.
 *
 * 4. Configure your API environment:
 *
 *    - `OAUTH_APPLE_CLIENT_ID` — the Services ID
 *    - `OAUTH_APPLE_TEAM_ID` — your Apple Developer Team ID
 *    - `OAUTH_APPLE_KEY_ID` — the 10-character Key ID
 *    - `OAUTH_APPLE_PRIVATE_KEY` — the PKCS8 PEM contents of the `.p8` file
 *      (newlines may be encoded as `\n`)
 *
 * 5. Restart your API so it picks up the environment variables.
 *
 * > **Your users should now be able to log in via Apple!**
 *
 * @example
 * ```typescript
 * import { randomBytes } from 'node:crypto'
 *
 * import { bond } from '@molecule/api-bond'
 * import type { OAuthProviderConfig } from '@molecule/api-oauth'
 * import { getAuthorizeUrl, serverName, verify } from '@molecule/api-oauth-apple'
 *
 * // Startup: bond NAMED by serverName ('apple'). Env: OAUTH_APPLE_CLIENT_ID (Services ID),
 * // OAUTH_APPLE_TEAM_ID, OAUTH_APPLE_KEY_ID, OAUTH_APPLE_PRIVATE_KEY (.p8 PEM), APP_ORIGIN.
 * const apple: OAuthProviderConfig = { serverName, verify, getAuthorizeUrl }
 * bond('oauth', serverName, apple)
 *
 * // Initiation: fresh CSRF state (httpOnly cookie). Apple has NO PKCE.
 * const state = randomBytes(32).toString('hex')
 * // Apple POSTs `code` + `state` (form_post) here: a SERVER route registered on the Services ID.
 * const redirectUri = `${process.env.APP_ORIGIN ?? 'https://app.example.com'}/auth/apple/callback`
 * const authorizeUrl = getAuthorizeUrl({ state, redirectUri })
 * // → 302 the browser to authorizeUrl; null means OAUTH_APPLE_CLIENT_ID is unset.
 *
 * // Callback (after checking the posted state equals the cookie): no code verifier.
 * const user = await verify('code-from-form-post-body', undefined, redirectUri)
 * // user: { username: 'ada@privaterelay.appleid.com@apple', email, emailVerified, oauthId: sub }
 * // null → Apple rejected the code (invalid_grant → respond 403); a throw → config/network failure.
 * console.log(authorizeUrl, user?.oauthId)
 * ```
 *
 * @remarks
 * - **Bond it NAMED: `bond('oauth', serverName, { serverName, verify,
 *   getAuthorizeUrl })`** — there is no `setProvider` and no default export.
 * - **The callback is an HTTP POST, not a query string.** With the default
 *   `name email` scope Apple uses `response_mode=form_post`, so a client-side
 *   SPA route never sees the `code`; `redirectUri` must be a server route that
 *   reads the form body and forwards `code` + `state` to the login handler.
 * - **No PKCE**: `getAuthorizeUrl` ignores `codeChallenge`; call
 *   `verify(code, undefined, redirectUri)` with the SAME `redirectUri`.
 * - **All four env vars are required at `verify()` time** — the client secret
 *   is a short-lived ES256 JWT signed on every exchange from
 *   `OAUTH_APPLE_PRIVATE_KEY` (literal `\n` escapes are accepted). A missing
 *   one throws "`<NAME>` is not configured.".
 * - The user's `name` is sent by Apple ONLY in the first form-post (a `user`
 *   JSON field), never in the ID token — `verify()` does not return it; persist
 *   it yourself on first sign-in. The email may be a private-relay address.
 *
 * @module
 */

export * from './authorize.js'
export * from './browser-guard.js'
export * from './client-secret.js'
export * from './jwks.js'
export * from './secrets.js'
export * from './tokens.js'
export * from './types.js'
export * from './verify.js'
export * from './verify-id-token.js'
