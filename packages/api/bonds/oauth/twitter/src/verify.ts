/**
 * Twitter OAuth verification for molecule.dev.
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when verify.js is imported directly
// (not through the package barrel).
import './secrets.js'

import { getLogger } from '@molecule/api-bond'
import { get, post } from '@molecule/api-http'
import type { OAuthVerifier } from '@molecule/api-oauth'

const logger = getLogger()

/** The OAuth server identifier for Twitter. */
export const serverName = `twitter` as const

/**
 * Strip client secrets and authorization codes from an error before logging
 * or rethrowing, so a failed token/user-info exchange never emits the OAuth
 * `client_secret` (or `code`) to logs (CWE-532). Returns a new, redacted error
 * carrying only the (scrubbed) message and the response status.
 *
 * @param error - The original error.
 * @param secrets - Sensitive strings to redact (`undefined` entries ignored).
 * @returns A sanitized error suitable for logging or surfacing.
 */
const sanitizeError = (error: unknown, secrets: Array<string | undefined>): Error => {
  // Only redact strings of meaningful length — short values would otherwise
  // scrub legitimate prose out of the message.
  const MIN_SECRET_LEN = 8
  const filtered = secrets.filter(
    (s): s is string => typeof s === 'string' && s.length >= MIN_SECRET_LEN,
  )
  const redact = (input: string): string => {
    let out = input
    for (const secret of filtered) {
      while (out.includes(secret)) {
        out = out.replace(secret, '[REDACTED]')
      }
    }
    return out
  }

  const baseMessage = error instanceof Error ? error.message : String(error)
  const sanitized = new Error(redact(baseMessage))
  sanitized.name = error instanceof Error ? error.name : 'Error'
  if (error && typeof error === 'object') {
    const maybeResponse = (error as { response?: { status?: number } }).response
    if (maybeResponse && typeof maybeResponse.status === 'number') {
      ;(sanitized as Error & { status?: number }).status = maybeResponse.status
    }
  }
  return sanitized
}

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
        timeout: 15_000,
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
      timeout: 15_000,
    })

    return {
      username: `${oauthData.username}@twitter`,
      email: (oauthData.email as string) || undefined,
      // Twitter's OAuth2 `/users/me` does not return an email-verification
      // signal (and typically no email at all without the legacy elevated
      // access). We cannot affirm mailbox ownership, so report unverified —
      // the conservative, safe default.
      emailVerified: false,
      oauthServer: serverName,
      oauthId: oauthData.id ? String(oauthData.id) : ``,
      oauthData,
    }
  } catch (error) {
    const safe = sanitizeError(error, [process.env.OAUTH_TWITTER_CLIENT_SECRET, code])
    logger.error('Twitter OAuth verify error:', safe.message)
    throw safe
  }
}
