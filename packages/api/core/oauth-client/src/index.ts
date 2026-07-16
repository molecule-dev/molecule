/**
 * Provider-agnostic OAuth 2.0 client interface for molecule.dev.
 *
 * Defines the `OAuthClientProvider` interface for consuming external OAuth 2.0
 * APIs — building authorization URLs, exchanging codes for tokens, refreshing
 * tokens, making authenticated requests, and revoking access. Bond packages
 * (generic OAuth2, etc.) implement this interface. Application code uses the
 * convenience functions (`getAuthorizationUrl`, `getToken`, `refreshToken`,
 * `request`, `revokeToken`) which delegate to the bonded provider.
 *
 * @remarks
 * **This package CONSUMES external OAuth APIs on a user's behalf** (calendar,
 * repo, CRM integrations). For "Log in with X" use `@molecule/api-oauth` +
 * `@molecule/api-resource-user`'s `logInOAuth`, which already implement the
 * login flow's security checks — don't rebuild login on this client.
 *
 * - The full `OAuthConfig` — especially `clientSecret` — is SERVER-SIDE only,
 *   built from env/secrets (never literals in code). The browser only ever
 *   receives the authorization URL and returns the `code` to your API, which
 *   performs the exchange.
 * - `state` and PKCE are optional parameters but NOT optional practice: send a
 *   per-session random `state` (and a `codeChallenge`, method `'S256'`) on
 *   `getAuthorizationUrl`, REJECT the callback unless the returned `state`
 *   matches the stored one, then pass the matching `codeVerifier` in
 *   `getToken`'s options.
 * - Persist the returned `OAuthTokens` per user server-side (encrypted at
 *   rest). `refreshToken` is only present when the provider grants one (e.g.
 *   offline scopes); track `expiresAt` and refresh before use or on auth
 *   failure — access tokens are short-lived.
 * - `request(tokens, url, opts)` attaches the token for you but does NOT
 *   auto-refresh — it throws on a non-2xx response; refresh-and-retry on
 *   auth failure is the caller's loop.
 *
 * @example
 * ```typescript
 * import { setProvider, getAuthorizationUrl, getToken } from '@molecule/api-oauth-client'
 * import { provider as genericOAuth } from '@molecule/api-oauth-client-generic'
 *
 * setProvider(genericOAuth)
 *
 * const config = {
 *   id: 'github',
 *   clientId: 'abc123',
 *   clientSecret: 'secret',
 *   authorizationUrl: 'https://github.com/login/oauth/authorize',
 *   tokenUrl: 'https://github.com/login/oauth/access_token',
 *   redirectUri: 'https://myapp.com/callback',
 *   scopes: ['user', 'repo'],
 * }
 *
 * const authUrl = getAuthorizationUrl(config, { state: 'csrf-token' })
 * const tokens = await getToken(config, 'authorization-code')
 * ```
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual "connect account" screens/flows, and check
 * every box off one by one. A box you can't check is an integration bug to
 * fix — not a skip. The third-party CONSENT SCREEN cannot be driven in-sandbox,
 * so verify the token lifecycle + API-call wiring you own (authorize →
 * callback → `getToken` → token store → `refreshToken` → `request`), stubbing
 * the provider bond or the token endpoint where the real grant would occur:
 * - [ ] Connecting a third-party account from the UI runs
 *   authorize→callback→`getToken` and STORES the returned `OAuthTokens`
 *   (`accessToken` + `refreshToken`) server-side keyed to the authenticated
 *   user; the connection then shows as "connected" in the UI.
 * - [ ] An authenticated call to the third-party API via `request(tokens, url)`
 *   using the STORED token succeeds and its result appears in the app (bond a
 *   stub/test provider if available, else assert `request` is invoked with the
 *   stored `accessToken` — never a hardcoded or browser-supplied one).
 * - [ ] Token REFRESH works: an expired `accessToken` (force/simulate expiry
 *   via `expiresAt`) is transparently refreshed with `refreshToken` and the
 *   call is RETRIED — confirm exactly ONE refresh + a stored-token update, not
 *   an auth error surfaced to the user (`request` does not auto-refresh; the
 *   caller's refresh-and-retry loop must).
 * - [ ] Disconnecting revokes/removes the stored tokens (`revokeToken` + delete
 *   from the store) and the connection no longer works — a subsequent API call
 *   fails until the account is reconnected.
 * - [ ] SECURITY: `accessToken`/`refreshToken` + `clientSecret` live
 *   server-side only (encrypted at rest ideally) and are NEVER sent to the
 *   browser — the client only ever receives the authorization URL and returns
 *   the `code`.
 * - [ ] Tokens are scoped per user: user A's stored connection cannot be used
 *   to act as user B (the store is keyed by user id; handlers load only the
 *   caller's own tokens).
 * - [ ] The callback verifies `state` (CSRF): a per-session random `state` sent
 *   on `getAuthorizationUrl` must match on the callback, and a missing or
 *   mismatched `state` is rejected BEFORE any token exchange.
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
