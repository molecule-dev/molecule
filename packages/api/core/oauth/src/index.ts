/**
 * OAuth core interface for molecule.dev.
 *
 * Defines the standard interface for OAuth providers.
 *
 * @remarks
 * The OAuth authorization-code flow has security steps a weak integration skips — these
 * are MANDATORY (the per-type docs carry the details):
 *
 * - **`state` is CSRF protection, not optional.** On initiation, generate a random
 *   `state`, store it in an httpOnly cookie, and put it on the authorize URL
 *   ({@link OAuthAuthorizeUrlParams.state}). On callback, reject unless the returned
 *   `state` matches the cookie — no state check is a login-CSRF / account-takeover hole.
 * - **Use PKCE** ({@link OAuthAuthorizeUrlParams.codeChallenge}, method `'S256'`): derive a
 *   per-session code verifier, send its challenge on initiation, pass the verifier to
 *   {@link OAuthVerifier} on callback.
 * - **The code exchange is SERVER-SIDE.** {@link OAuthVerifier}`(code, …)` runs in your API
 *   and returns {@link OAuthUserProps} (or `null`). The OAuth **client secret** lives only
 *   in the API — never ship it to the browser; the browser only gets the authorize URL and
 *   returns the `code`.
 * - **Trust only `emailVerified === true`.** A provider email whose
 *   {@link OAuthUserProps.emailVerified} is not explicitly `true` MUST NOT take over an
 *   existing local account (squatter protection).
 *
 * `@molecule/api-resource-user`'s `logInOAuth` already implements this flow correctly —
 * prefer wiring a provider bond into it over hand-rolling the endpoints.
 *
 * - **This package has NO runtime functions** — only types. There is no
 *   `setProvider`/`verifyOAuthCode` here: bond each provider bond as a NAMED
 *   `oauth` bond keyed by its `serverName` (`bond('oauth', serverName, { serverName,
 *   verify, getAuthorizeUrl })`) and call its `verify` / `getAuthorizeUrl`.
 * - `verify` returns `null` when the provider REJECTS the code (403 to the user);
 *   it THROWS on network/infrastructure failures (500).
 * - `getAuthorizeUrl` returns `null` when the bond's client id env var is unset.
 *
 * @example
 * ```typescript
 * import { createHash, randomBytes } from 'node:crypto'
 *
 * import { bond, get } from '@molecule/api-bond'
 * import type { OAuthProviderConfig, OAuthUserProps } from '@molecule/api-oauth'
 * import { getAuthorizeUrl, serverName, verify } from '@molecule/api-oauth-github'
 *
 * // Startup: bond each provider NAMED by its serverName — `@molecule/api-resource-user`'s
 * // oauthAuthorize / logInOAuth handlers look it up with get('oauth', ':provider').
 * // Env: OAUTH_GITHUB_CLIENT_ID, OAUTH_GITHUB_CLIENT_SECRET (server only), APP_ORIGIN.
 * const github: OAuthProviderConfig = { serverName, verify, getAuthorizeUrl }
 * bond('oauth', serverName, github)
 *
 * // Initiation: a fresh CSRF state + PKCE pair per request, both kept in httpOnly cookies.
 * const state = randomBytes(32).toString('hex')
 * const codeVerifier = randomBytes(32).toString('base64url')
 * const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
 * const redirectUri = `${process.env.APP_ORIGIN}/`
 * const provider = get<OAuthProviderConfig>('oauth', 'github')
 * const authorizeUrl = provider?.getAuthorizeUrl?.({
 *   state,
 *   codeChallenge,
 *   codeChallengeMethod: 'S256',
 *   redirectUri,
 * }) // 302 the browser here; null → provider not configured (404)
 *
 * // Callback: reject unless the returned state equals the cookie, THEN exchange server-side.
 * const callback = { code: 'code-from-query-string', state }
 * if (callback.state !== state) throw new Error('Invalid OAuth state')
 * const props: OAuthUserProps | null = await github.verify(callback.code, codeVerifier, redirectUri)
 * // Only an explicit emailVerified === true may match/link an existing local account.
 * const trustedEmail = props?.emailVerified === true ? props.email : undefined
 * ```
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Clicking the app's "Sign in with {provider}" button (Google, GitHub, …)
 *   redirects to the provider's authorize URL carrying the correct client_id,
 *   the app's requested scopes, AND the app's registered redirect_uri — inspect
 *   the actual outbound URL (the 302 Location, or the address the popup/tab
 *   navigates to) and confirm each value; a missing or wrong one is the bug.
 * - [ ] The callback route exchanges the returned code SERVER-SIDE for a token,
 *   fetches the profile, and creates-or-links the app user + establishes a
 *   session — after the round-trip the app shows that user logged in. CAVEAT:
 *   the provider's own consent screen runs on ITS domain and CANNOT be driven
 *   in the sandbox, so verify the two boundaries you DO own — the authorize URL
 *   going out (above) and the callback coming back — not the provider's page.
 *   Complete the round-trip with a test/stub provider bond if one is wired;
 *   otherwise assert the callback handler's own behavior (state check → code
 *   exchange → user create-or-link → session). Never mock the flow or edit
 *   production code to bypass the provider.
 * - [ ] A returning OAuth user logs into the SAME account — sign in twice and
 *   confirm one user row linked by provider id (oauthServer + oauthId), not a
 *   fresh duplicate created each time.
 * - [ ] SECURITY — the `state` parameter is generated on initiation and
 *   verified on callback (CSRF protection): a mismatched or absent `state` is
 *   rejected (403); the `redirect_uri` is validated against an allowlist so an
 *   attacker cannot redirect the code elsewhere; and the client secret + tokens
 *   stay server-side — grep the browser bundle and network tab to confirm the
 *   secret never reaches the client (only the authorize URL and returned code
 *   cross the boundary).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './types.js'
