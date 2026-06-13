/**
 * Apple OAuth verification — implements the `@molecule/api-oauth`
 * `OAuthVerifier` contract by exchanging an authorization code for tokens
 * and decoding/validating the Apple-issued ID token.
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
import type { OAuthVerifier } from '@molecule/api-oauth'

import { exchangeCodeForTokens } from './tokens.js'
import type { AppleIdTokenClaims } from './types.js'
import { verifyIdToken } from './verify-id-token.js'

const logger = getLogger()

/** The OAuth server identifier for Apple. */
export const serverName = `apple` as const

/**
 * Apple does not expose a userinfo endpoint — the ID token *is* the user
 * info. This helper takes an Apple-issued ID token, verifies its
 * signature/issuer/audience/expiry, and returns the decoded claims.
 *
 * @param idToken - The Apple-issued ID token (JWT).
 * @returns The verified {@link AppleIdTokenClaims}.
 */
export const getUserInfo = async (idToken: string): Promise<AppleIdTokenClaims> =>
  verifyIdToken(idToken)

/**
 * Verifies an Apple OAuth authorization code and returns normalized
 * `OAuthUserProps`.
 *
 * Note: Apple only includes the user's `name` in the *initial* form-post
 * callback (not in the ID token), so callers wanting display-name capture
 * must persist that value separately at the redirect-handler layer.
 *
 * @param code - The authorization code from the OAuth callback.
 * @param _codeVerifier - Unused; included for {@link OAuthVerifier} signature compatibility.
 * @param redirectUri - The redirect URI used in the authorization request.
 * @returns Normalized OAuth user props.
 */
export const verify: OAuthVerifier = async (
  code: string,
  _codeVerifier?: string,
  redirectUri?: string,
) => {
  try {
    const tokens = await exchangeCodeForTokens(code, redirectUri)
    const claims = await verifyIdToken(tokens.id_token)

    const email = typeof claims.email === `string` ? claims.email : undefined
    const oauthId = String(claims.sub || ``)

    // Apple encodes `email_verified` as either a boolean `true` or the
    // string `'true'` depending on the token. Treat only an affirmative
    // value as verified; anything else (absent/false/'false') is unverified.
    const emailVerified =
      email !== undefined && (claims.email_verified === true || claims.email_verified === `true`)

    return {
      username: `${email || oauthId}@${serverName}`,
      email,
      emailVerified,
      oauthServer: serverName,
      oauthId,
      oauthData: {
        ...claims,
        access_token: tokens.access_token,
        id_token: tokens.id_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type,
        expires_in: tokens.expires_in,
      },
    }
  } catch (error) {
    logger.error(`Apple OAuth verify error:`, error)
    throw error
  }
}
