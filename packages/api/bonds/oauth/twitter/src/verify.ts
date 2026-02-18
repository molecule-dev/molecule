/**
 * Twitter OAuth verification for molecule.dev.
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
import { get, post } from '@molecule/api-http'
import type { OAuthVerifier } from '@molecule/api-oauth'

const logger = getLogger()

/** The OAuth server identifier for Twitter. */
export const serverName = `twitter` as const

/**
 * Verifies a Twitter OAuth code and responds with OAuth-related user props.
 * @param code - The authorization code from the OAuth callback.
 * @param codeVerifier - The PKCE code verifier (if PKCE was used).
 * @param redirectUri - The redirect URI used in the authorization request.
 * @returns An `OAuthUserInfo` with the user's Twitter username, email, and OAuth ID.
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
      `https://api.twitter.com/2/oauth2/token`,
      {
        client_id: process.env.OAUTH_TWITTER_CLIENT_ID,
        code,
        code_verifier: codeVerifier,
        grant_type: `authorization_code`,
        redirect_uri: redirectUri || process.env.APP_ORIGIN,
      },
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${process.env.OAUTH_TWITTER_CLIENT_ID}:${process.env.OAUTH_TWITTER_CLIENT_SECRET}`).toString('base64')}`,
          accept: `application/json`,
        },
      },
    )

    const token = response.data.access_token

    const {
      data: { data: oauthData },
    } = await get<{ data: Record<string, unknown> }>(`https://api.twitter.com/2/users/me`, {
      headers: {
        accept: `application/json`,
        authorization: `Bearer ${token}`,
      },
    })

    return {
      username: `${oauthData.username}@twitter`,
      email: (oauthData.email as string) || undefined,
      oauthServer: serverName,
      oauthId: oauthData.id ? String(oauthData.id) : ``,
      oauthData,
    }
  } catch (error) {
    logger.error('Twitter OAuth verify error:', error)
    throw error
  }
}
