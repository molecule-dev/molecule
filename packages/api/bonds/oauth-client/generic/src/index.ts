/**
 * Generic OAuth 2.0 client provider for molecule.dev.
 *
 * Implements the standard OAuth 2.0 authorization code flow with PKCE support,
 * using Node.js built-in `fetch` for HTTP requests. Compatible with any
 * OAuth 2.0 compliant provider (GitHub, Google, GitLab, Slack, etc.).
 *
 * @example
 * ```typescript
 * import type { OAuthConfig } from '@molecule/api-oauth-client'
 * import { getAuthorizationUrl, getToken, request, setProvider } from '@molecule/api-oauth-client'
 * import { createProvider } from '@molecule/api-oauth-client-generic'
 *
 * // Startup: bond once (singleton). GitHub accepts client credentials in the POST body.
 * setProvider(createProvider({ clientAuthMethod: 'body', timeout: 10_000 }))
 *
 * const github: OAuthConfig = {
 *   id: 'github',
 *   clientId: process.env.GITHUB_CLIENT_ID ?? '',
 *   clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
 *   authorizationUrl: 'https://github.com/login/oauth/authorize',
 *   tokenUrl: 'https://github.com/login/oauth/access_token',
 *   redirectUri: 'https://app.example.com/oauth/github/callback',
 *   scopes: ['read:user'],
 * }
 *
 * // 1. Redirect the user here (persist `state` in the session to check on callback).
 * const state = crypto.randomUUID()
 * const authUrl = getAuthorizationUrl(github, { state })
 *
 * // 2. On the callback route, exchange `?code=` and call the API with the tokens.
 * export async function handleCallback(code: string): Promise<unknown> {
 *   const tokens = await getToken(github, code) // { accessToken, tokenType, refreshToken?, expiresAt? }
 *   return request(tokens, 'https://api.github.com/user') // parsed JSON
 * }
 * console.log('redirect the browser to', authUrl)
 * ```
 *
 * @remarks
 * - **Bond with the core's `setProvider(...)`, then call the CORE functions**
 *   (`getAuthorizationUrl`, `getToken`, `refreshToken`, `request`,
 *   `revokeToken`) — every one takes the per-IdP `OAuthConfig` as its first
 *   argument; the bond itself holds no client id/secret.
 * - **It does NOT generate or verify `state` or PKCE values.** Create the
 *   `state` (and `codeVerifier` / `codeChallenge` if the IdP needs PKCE)
 *   yourself, store them, and compare on callback; pass the verifier via
 *   `getToken(config, code, { codeVerifier })`.
 * - `clientAuthMethod: 'header'` sends HTTP Basic credentials instead of
 *   `client_id` / `client_secret` in the body — some IdPs require one or the
 *   other. `timeout` is MILLISECONDS (default 10000).
 * - Token and API errors THROW (non-2xx, an `error` field, or a 2xx with no
 *   `access_token`). `revokeToken()` throws when the config has no
 *   `revocationUrl`. `expiresAt` is an ISO string computed from `expires_in`
 *   (seconds).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
