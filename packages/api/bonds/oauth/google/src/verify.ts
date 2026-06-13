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

/** Default Google access-token endpoint. Overridable via `OAUTH_GOOGLE_TOKEN_URL`. */
const DEFAULT_TOKEN_URL = `https://www.googleapis.com/oauth2/v4/token`
/** Default Google userinfo endpoint. Overridable via `OAUTH_GOOGLE_USER_URL`. */
const DEFAULT_USER_URL = `https://www.googleapis.com/oauth2/v3/userinfo`

/**
 * Verifies a Google OAuth code and responds with OAuth-related user props.
 *
 * Endpoints can be overridden via `OAUTH_GOOGLE_TOKEN_URL` and
 * `OAUTH_GOOGLE_USER_URL` for testing (E2E mocks) or proxy deployments.
 *
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
    const tokenUrl = process.env.OAUTH_GOOGLE_TOKEN_URL || DEFAULT_TOKEN_URL
    const userUrl = process.env.OAUTH_GOOGLE_USER_URL || DEFAULT_USER_URL
    const response = await post<{
      access_token: string
      token_type: string
      scope: string
    }>(
      tokenUrl,
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
        timeout: 15_000,
      },
    )

    const token = response.data.access_token

    const { data: oauthData } = await get<Record<string, unknown>>(userUrl, {
      headers: {
        accept: `application/json`,
        authorization: `Bearer ${token}`,
      },
      timeout: 15_000,
    })

    const email = (oauthData.email as string) || undefined

    // Google's OpenID `userinfo` response carries an `email_verified` boolean
    // (and historically `verified_email` on the v1/v2 endpoints). Trust only
    // an explicit `true`; absent/false means the address is unverified.
    const emailVerified =
      email !== undefined &&
      (oauthData.email_verified === true || oauthData.verified_email === true)

    return {
      username: `${oauthData.email || oauthData.sub}@google`,
      email,
      emailVerified,
      oauthServer: serverName,
      oauthId: oauthData.sub ? String(oauthData.sub) : ``,
      oauthData,
    }
  } catch (error) {
    logger.error('Google OAuth verify error:', error)
    throw error
  }
}
