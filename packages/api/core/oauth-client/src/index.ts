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
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
