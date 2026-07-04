/**
 * Google OAuth verification for molecule.dev.
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when verify.js is imported directly
// (not through the package barrel).
import './secrets.js'

import { getLogger } from '@molecule/api-bond'
import type { HttpError } from '@molecule/api-http'
import { get, post } from '@molecule/api-http'
import type { OAuthVerifier } from '@molecule/api-oauth'

const logger = getLogger()

/** The OAuth server identifier for Google. */
export const serverName = `google` as const

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
 * @returns An `OAuthUserInfo` with the user's Google email/sub, and OAuth ID —
 * or `null` when Google affirmatively rejected the code (HTTP 400
 * `invalid_grant`: bad/expired/already-redeemed code or PKCE verifier
 * mismatch), which the consumer surfaces as a 403 rather than a 500.
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

    // Defensive: a 2xx token response with no `access_token` means the
    // exchange did not actually succeed (e.g. a proxy or mock responding 200
    // with an error body). Treat it as the provider rejecting the code and
    // return `null` — never call the userinfo endpoint with `Bearer
    // undefined` and surface Google's 401 as a misleading 500.
    if (!token) {
      const exchangeError = (response.data as { error?: string }).error
      logger.warn('Google OAuth token response had no access_token', {
        error: exchangeError ?? 'no access_token in token response',
      })
      return null
    }

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
    // Google's token endpoint responds HTTP 400 `{"error":"invalid_grant"}`
    // for a bad/expired/already-redeemed code (and for a PKCE verifier
    // mismatch) — the provider AFFIRMATIVELY rejecting the code, a
    // client-side failure rather than an infrastructure fault. Per the
    // `OAuthVerifier` contract that is a `null` return (consumer responds
    // 403 "verification failed"), never a throw (which would surface as a
    // misleading 500). Every other error keeps the sanitize-and-throw path.
    const rejection =
      error && typeof error === 'object' ? (error as Partial<HttpError>).response : undefined
    if (
      rejection?.status === 400 &&
      (rejection.data as { error?: string } | null)?.error === 'invalid_grant'
    ) {
      logger.warn('Google OAuth code exchange rejected', { error: 'invalid_grant' })
      return null
    }

    const safe = sanitizeError(error, [process.env.OAUTH_GOOGLE_CLIENT_SECRET, code])
    logger.error('Google OAuth verify error:', safe.message)
    throw safe
  }
}
