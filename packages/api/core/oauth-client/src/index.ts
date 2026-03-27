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
export * from './types.js'

// Provider exports
export * from './provider.js'
