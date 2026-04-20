/**
 * OAuth client provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-oauth-client-generic`) call `setProvider()` during setup.
 * Application code uses the convenience functions which delegate to the bonded provider.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type {
  AuthorizationUrlOptions,
  OAuthClientProvider,
  OAuthConfig,
  OAuthTokens,
  RequestOptions,
  TokenExchangeOptions,
} from './types.js'

const BOND_TYPE = 'oauth-client'
expectBond(BOND_TYPE)

/**
 * Registers an OAuth client provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param provider - The OAuth client provider implementation to bond.
 */
export const setProvider = (provider: OAuthClientProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded OAuth client provider, throwing if none is configured.
 *
 * @returns The bonded OAuth client provider.
 * @throws {Error} If no OAuth client provider has been bonded.
 */
export const getProvider = (): OAuthClientProvider => {
  try {
    return bondRequire<OAuthClientProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('oauthClient.error.noProvider', undefined, {
        defaultValue: 'OAuth client provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether an OAuth client provider is currently bonded.
 *
 * @returns `true` if an OAuth client provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Builds the authorization URL that the user should be redirected to.
 *
 * @param config - The OAuth provider configuration.
 * @param options - Optional authorization URL parameters.
 * @returns The fully-qualified authorization URL.
 * @throws {Error} If no OAuth client provider has been bonded.
 */
export const getAuthorizationUrl = (
  config: OAuthConfig,
  options?: AuthorizationUrlOptions,
): string => {
  return getProvider().getAuthorizationUrl(config, options)
}

/**
 * Exchanges an authorization code for access/refresh tokens.
 *
 * @param config - The OAuth provider configuration.
 * @param code - The authorization code received from the provider.
 * @param options - Optional token exchange parameters.
 * @returns The token set.
 * @throws {Error} If no OAuth client provider has been bonded.
 */
export const getToken = async (
  config: OAuthConfig,
  code: string,
  options?: TokenExchangeOptions,
): Promise<OAuthTokens> => {
  return getProvider().getToken(config, code, options)
}

/**
 * Refreshes an expired access token using a refresh token.
 *
 * @param config - The OAuth provider configuration.
 * @param token - The refresh token string.
 * @returns A new token set.
 * @throws {Error} If no OAuth client provider has been bonded.
 */
export const refreshToken = async (config: OAuthConfig, token: string): Promise<OAuthTokens> => {
  return getProvider().refreshToken(config, token)
}

/**
 * Makes an authenticated HTTP request to a resource server.
 *
 * @param tokens - The current token set.
 * @param url - The resource URL.
 * @param options - Optional request parameters.
 * @returns The parsed response body.
 * @throws {Error} If no OAuth client provider has been bonded.
 */
export const request = async (
  tokens: OAuthTokens,
  url: string,
  options?: RequestOptions,
): Promise<unknown> => {
  return getProvider().request(tokens, url, options)
}

/**
 * Revokes an access or refresh token.
 *
 * @param config - The OAuth provider configuration.
 * @param token - The token to revoke.
 * @returns Resolves when the token is revoked.
 * @throws {Error} If no OAuth client provider has been bonded.
 */
export const revokeToken = async (config: OAuthConfig, token: string): Promise<void> => {
  return getProvider().revokeToken(config, token)
}
