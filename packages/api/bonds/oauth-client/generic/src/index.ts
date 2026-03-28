/**
 * Generic OAuth 2.0 client provider for molecule.dev.
 *
 * Implements the standard OAuth 2.0 authorization code flow with PKCE support,
 * using Node.js built-in `fetch` for HTTP requests. Compatible with any
 * OAuth 2.0 compliant provider (GitHub, Google, GitLab, Slack, etc.).
 *
 * @example
 * ```typescript
 * import { setProvider, getAuthorizationUrl, getToken } from '@molecule/api-oauth-client'
 * import { provider } from '@molecule/api-oauth-client-generic'
 *
 * setProvider(provider)
 *
 * const config = {
 *   id: 'github',
 *   clientId: process.env.GITHUB_CLIENT_ID,
 *   clientSecret: process.env.GITHUB_CLIENT_SECRET,
 *   authorizationUrl: 'https://github.com/login/oauth/authorize',
 *   tokenUrl: 'https://github.com/login/oauth/access_token',
 *   redirectUri: 'https://myapp.com/callback',
 *   scopes: ['user', 'repo'],
 * }
 *
 * const authUrl = getAuthorizationUrl(config, { state: 'random-csrf' })
 * // Redirect user to authUrl, then on callback:
 * const tokens = await getToken(config, code)
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
