/**
 * GitLab OAuth provider implementation.
 *
 * ## Setup
 *
 * 1. Log into [GitLab](https://gitlab.com) (or sign up).
 *
 * 2. Open the [GitLab OAuth Apps](https://gitlab.com/oauth/applications) page found under "User Settings -> Applications".
 *
 * 3. Create a new OAuth app.
 *
 * 4. Fill out your app's information. You can create an OAuth app for development and another for production.
 *
 *     - For development, your "Redirect URI" should be your app's local development origin, e.g. `http://localhost:3000`.
 *
 *     - For production, your "Redirect URI" should be your app's production development origin, e.g. `https://app.your-app.com`. This should typically match your API's `APP_ORIGIN` environment variable.
 *
 * 5. Uncheck the "Expire access tokens" option if you need to access user data indefinitely.
 *
 * 6. Check the "read_user" scope, at a minimum.
 *
 * 7. Click the "Save application" button.
 *
 * 8. You should be taken to the OAuth app's page with the client ID (i.e., "Application ID") and a button to copy the client secret.
 *
 *     8.1. Set the client ID to your API's `OAUTH_GITLAB_CLIENT_ID` environment variable and your app's `REACT_APP_OAUTH_GITLAB_CLIENT_ID` environment variable.
 *
 *     8.2. Generate a client secret and set it to your API's `OAUTH_GITLAB_CLIENT_SECRET` environment variable.
 *
 * 9. Click the "Continue" button.
 *
 * 10. Restart your API and/or rebuild your app so that they have the environment variables.
 *
 * > **Your users should now be able to log in via GitLab!**
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'

import { getLogger } from '@molecule/api-bond'
import { get, post } from '@molecule/api-http'
import type { OAuthVerifier } from '@molecule/api-oauth'

const logger = getLogger()

/** The OAuth server identifier for GitLab. */
export const serverName = `gitlab` as const

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
 * Verifies a GitLab OAuth code and responds with OAuth-related user props.
 * @param code - The authorization code from the OAuth callback.
 * @param codeVerifier - The PKCE code verifier (if PKCE was used).
 * @param redirectUri - The redirect URI used in the authorization request.
 * @returns An `OAuthUserInfo` with the user's GitLab username, email, and OAuth ID.
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
      `https://gitlab.com/oauth/token`,
      {
        client_id: process.env.OAUTH_GITLAB_CLIENT_ID,
        client_secret: process.env.OAUTH_GITLAB_CLIENT_SECRET,
        code,
        code_verifier: codeVerifier,
        grant_type: 'authorization_code',
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

    const { data: oauthData } = await get<Record<string, unknown>>(
      `https://gitlab.com/api/v4/user`,
      {
        headers: {
          accept: `application/json`,
          authorization: `Bearer ${token}`,
        },
        timeout: 15_000,
      },
    )

    const email = (oauthData.email as string) || undefined

    // GitLab's `/user` (current user) endpoint exposes `confirmed_at` — the
    // timestamp the account's primary email was confirmed. A confirmed primary
    // email means GitLab verified mailbox ownership. Treat only a present
    // `confirmed_at` as verified; absent means unverified (the safe default,
    // e.g. self-hosted instances with email confirmation disabled).
    const emailVerified = email !== undefined && Boolean(oauthData.confirmed_at)

    return {
      username: `${oauthData.username}@gitlab`,
      email,
      emailVerified,
      oauthServer: serverName,
      oauthId: oauthData.id ? String(oauthData.id) : ``,
      oauthData,
    }
  } catch (error) {
    const safe = sanitizeError(error, [process.env.OAUTH_GITLAB_CLIENT_SECRET, code])
    logger.error('GitLab OAuth verify error:', safe.message)
    throw safe
  }
}
