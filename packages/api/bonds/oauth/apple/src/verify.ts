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
 * Strip client secrets and authorization codes from an error before logging
 * or rethrowing, so a failed token exchange never emits the OAuth `code` (or,
 * via the request body redaction in `@molecule/api-http`, the generated
 * client-secret JWT) to logs (CWE-532). Returns a new, redacted error carrying
 * only the (scrubbed) message and the response status.
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
 * `OAuthUserProps`, or `null` when Apple affirmatively rejects the code
 * (HTTP 400 `invalid_grant` from `/auth/token` — invalid/expired/reused) so
 * the consumer surfaces a clean 403 instead of a misleading 500.
 *
 * Note: Apple only includes the user's `name` in the *initial* form-post
 * callback (not in the ID token), so callers wanting display-name capture
 * must persist that value separately at the redirect-handler layer.
 *
 * @param code - The authorization code from the OAuth callback.
 * @param _codeVerifier - Unused; included for {@link OAuthVerifier} signature compatibility.
 * @param redirectUri - The redirect URI used in the authorization request.
 * @returns Normalized OAuth user props, or `null` when Apple rejected the code.
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
      // Store ONLY the verified identity/profile claims from the ID token —
      // NEVER the access/refresh/id tokens. `oauthData` is part of the
      // user's READABLE props (returned by `GET /api/users/:id`), so
      // persisting bearer credentials here would leak them to the browser.
      // The tokens are used transiently above (the `id_token` is verified)
      // and deliberately dropped. This matches the sibling OAuth bonds
      // (google/github/gitlab/twitter/microsoft), which all store only the
      // profile/userinfo response in `oauthData`.
      oauthData: { ...claims },
    }
  } catch (error) {
    // Apple's `/auth/token` endpoint responds HTTP 400 with
    // `{ "error": "invalid_grant" }` for an invalid/expired/reused
    // authorization code — the provider AFFIRMATIVELY rejecting the code (a
    // client-side failure, not an infrastructure fault). Per the
    // `OAuthVerifier` contract return `null` (consumer responds 403
    // "verification failed") instead of throwing, which would misreport it
    // as a 500. Everything else — missing env configuration (requireEnv),
    // an id_token failing signature/claims verification (an anomaly/attack
    // signal, not a code rejection), network errors — keeps the
    // sanitize + logger.error + throw path below.
    const response = (error as { response?: { status?: number; data?: unknown } } | null)?.response
    if (response?.status === 400) {
      const providerError = (response.data as { error?: string } | undefined)?.error
      if (providerError === `invalid_grant`) {
        logger.warn(`Apple OAuth code exchange rejected`, { error: providerError })
        return null
      }
    }

    const safe = sanitizeError(error, [code])
    logger.error(`Apple OAuth verify error:`, safe.message)
    throw safe
  }
}
