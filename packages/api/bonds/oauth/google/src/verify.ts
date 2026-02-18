/**
 * Google OAuth verification for molecule.dev.
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
import { get, post } from '@molecule/api-http'
import type { OAuthVerifier } from '@molecule/api-oauth'

const logger = getLogger()

/** The OAuth server identifier for Google. */
export const serverName = `google` as const

/**
 * Verifies a Google OAuth code and responds with OAuth-related user props.
 * @param code - The authorization code from the OAuth callback.
 * @param codeVerifier - The PKCE code verifier (if PKCE was used).
 * @param redirectUri - The redirect URI used in the authorization request.
 * @returns An `OAuthUserInfo` with the user's Google email/sub, and OAuth ID.
 */
export const verify: OAuthVerifier = async (
  code: string,
  codeVerifier?: string,
  redirectUri?: string,
) => {
  try {
    const response = await post<{
      access_token: string
      token_type: string
      scope: string
    }>(
      `https://www.googleapis.com/oauth2/v4/token`,
      {
        client_id: process.env.OAUTH_GOOGLE_CLIENT_ID,
        client_secret: process.env.OAUTH_GOOGLE_CLIENT_SECRET,
        code,
        code_verifier: codeVerifier,
        grant_type: `authorization_code`,
        redirect_uri: redirectUri || process.env.APP_ORIGIN,
      },
      {
        headers: {
          accept: `application/json`,
        },
      },
    )

    const token = response.data.access_token

    const { data: oauthData } = await get<Record<string, unknown>>(
      `https://www.googleapis.com/oauth2/v3/userinfo`,
      {
        headers: {
          accept: `application/json`,
          authorization: `Bearer ${token}`,
        },
      },
    )

    return {
      username: `${oauthData.email || oauthData.sub}@google`,
      email: (oauthData.email as string) || undefined,
      oauthServer: serverName,
      oauthId: oauthData.sub ? String(oauthData.sub) : ``,
      oauthData,
    }
  } catch (error) {
    logger.error('Google OAuth verify error:', error)
    throw error
  }
}
