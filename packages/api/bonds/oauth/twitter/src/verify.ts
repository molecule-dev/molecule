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

/** Default X (Twitter) access-token endpoint. Overridable via `OAUTH_TWITTER_TOKEN_URL`. */
const DEFAULT_TOKEN_URL = `https://api.twitter.com/2/oauth2/token`
/** Default X (Twitter) user-info endpoint. Overridable via `OAUTH_TWITTER_USER_URL`. */
const DEFAULT_USER_URL = `https://api.twitter.com/2/users/me`

/**
 * Verifies a Twitter OAuth code and responds with OAuth-related user props.
 *
 * The token and user-info URLs default to api.twitter.com, but can be
 * overridden via `OAUTH_TWITTER_TOKEN_URL` and `OAUTH_TWITTER_USER_URL`
 * (pairing with `OAUTH_TWITTER_AUTHORIZE_URL` for E2E mock OAuth servers,
 * consistent with the github/gitlab/google bonds).
 *
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
    const tokenUrl = process.env.OAUTH_TWITTER_TOKEN_URL || DEFAULT_TOKEN_URL
    const userUrl = process.env.OAUTH_TWITTER_USER_URL || DEFAULT_USER_URL

    const response = await post<{
      access_token: string
      token_type: string
      scope: string
    }>(
      tokenUrl,
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

    // Defensive: a 2xx token response without an `access_token` means the
    // exchange did not actually succeed — the provider rejected it in the
    // body. Per the `OAuthVerifier` contract return `null` (consumer responds
    // 403 "verification failed") instead of blundering on to `/2/users/me`
    // with `Bearer undefined` and surfacing X's 401 as a misleading 500.
    if (!token) {
      const exchangeError = (response.data as { error?: string }).error
      logger.warn('Twitter OAuth code exchange rejected', {
        error: exchangeError ?? 'no access_token in token response',
      })
      return null
    }

    const {
      data: { data: oauthData },
    } = await get<{ data: Record<string, unknown> }>(userUrl, {
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
    // X's token endpoint responds HTTP 400 for a rejected authorization code —
    // the provider AFFIRMATIVELY rejecting the code (forged/expired/reused), a
    // client-side failure rather than an infrastructure fault. X reports it as
    // `invalid_request` with a "Value passed for the authorization code was
    // invalid, or expired." description (rather than the RFC 6749
    // `invalid_grant`) — handle both. The `error_description` guard keeps
    // genuinely-malformed requests (e.g. a missing parameter — a bug in our
    // request) on the throw path. Per the `OAuthVerifier` contract return
    // `null` (consumer responds 403 "verification failed") instead of
    // throwing, which would misreport it as a 500.
    const response = (error as { response?: { status?: number; data?: unknown } } | null)?.response
    if (response?.status === 400) {
      const data = (response.data ?? {}) as { error?: string; error_description?: unknown }
      const isRejectedCode =
        data.error === 'invalid_grant' ||
        (data.error === 'invalid_request' &&
          /authorization code/i.test(String(data.error_description ?? '')))
      if (isRejectedCode) {
        logger.warn('Twitter OAuth code exchange rejected', {
          error: data.error,
          errorDescription: data.error_description,
        })
        return null
      }
    }

    const safe = sanitizeError(error, [process.env.OAUTH_TWITTER_CLIENT_SECRET, code])
    logger.error('Twitter OAuth verify error:', safe.message)
    throw safe
  }
}
