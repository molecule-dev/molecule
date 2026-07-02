/**
 * Apple `/auth/token` interactions: exchange code for tokens and refresh
 * an access token.
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when tokens.js is imported directly
// (not through the package barrel).
import './secrets.js'

import { post } from '@molecule/api-http'

import { createAppleClientSecret } from './client-secret.js'
import type { AppleTokenResponse } from './types.js'

/** Apple token endpoint. */
export const APPLE_TOKEN_URL = `https://appleid.apple.com/auth/token` as const

const requireEnv = (name: string): string => {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} is not configured.`)
  }

  return value
}

const buildClientSecret = (): string =>
  createAppleClientSecret({
    teamId: requireEnv(`OAUTH_APPLE_TEAM_ID`),
    clientId: requireEnv(`OAUTH_APPLE_CLIENT_ID`),
    keyId: requireEnv(`OAUTH_APPLE_KEY_ID`),
    privateKey: requireEnv(`OAUTH_APPLE_PRIVATE_KEY`),
  })

/**
 * Exchanges an authorization code for Apple-issued tokens.
 *
 * @param code - The authorization code from the OAuth callback.
 * @param redirectUri - The redirect URI used in the authorization request. Defaults to `APP_ORIGIN`.
 * @returns The token-exchange response, including `id_token` and (typically) a `refresh_token`.
 */
export const exchangeCodeForTokens = async (
  code: string,
  redirectUri?: string,
): Promise<AppleTokenResponse> => {
  const clientId = requireEnv(`OAUTH_APPLE_CLIENT_ID`)
  const clientSecret = buildClientSecret()

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: `authorization_code`,
    redirect_uri: redirectUri || process.env.APP_ORIGIN || ``,
  })

  const { data } = await post<AppleTokenResponse>(APPLE_TOKEN_URL, body.toString(), {
    headers: {
      accept: `application/json`,
      'content-type': `application/x-www-form-urlencoded`,
    },
    timeout: 15_000,
  })

  return data
}

/**
 * Exchanges a refresh token for a fresh access token (and possibly a new id_token).
 *
 * @param refreshToken - The refresh token previously issued by Apple.
 * @returns The token-refresh response.
 */
export const refreshAccessToken = async (refreshToken: string): Promise<AppleTokenResponse> => {
  const clientId = requireEnv(`OAUTH_APPLE_CLIENT_ID`)
  const clientSecret = buildClientSecret()

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: `refresh_token`,
    refresh_token: refreshToken,
  })

  const { data } = await post<AppleTokenResponse>(APPLE_TOKEN_URL, body.toString(), {
    headers: {
      accept: `application/json`,
      'content-type': `application/x-www-form-urlencoded`,
    },
    timeout: 15_000,
  })

  return data
}
