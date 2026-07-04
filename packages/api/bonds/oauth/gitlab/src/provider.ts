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
 * ### Self-managed GitLab
 *
 * The bond defaults to GitLab.com endpoints. For a self-managed GitLab
 * instance (or an E2E mock OAuth server), override the initiation and
 * verification endpoints via the `OAUTH_GITLAB_AUTHORIZE_URL`,
 * `OAUTH_GITLAB_TOKEN_URL`, and `OAUTH_GITLAB_USER_URL` environment
 * variables.
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'

import { getLogger } from '@molecule/api-bond'
import { get, post } from '@molecule/api-http'
import type { OAuthAuthorizeUrlBuilder, OAuthVerifier } from '@molecule/api-oauth'

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

/** Default GitLab access-token endpoint. Overridable via `OAUTH_GITLAB_TOKEN_URL`. */
const DEFAULT_TOKEN_URL = `https://gitlab.com/oauth/token`
/** Default GitLab user-info endpoint. Overridable via `OAUTH_GITLAB_USER_URL`. */
const DEFAULT_USER_URL = `https://gitlab.com/api/v4/user`
/** Default GitLab authorization endpoint. Overridable via `OAUTH_GITLAB_AUTHORIZE_URL`. */
const DEFAULT_AUTHORIZE_URL = `https://gitlab.com/oauth/authorize`

/**
 * Builds the GitLab authorization URL for OAuth initiation
 * (`GET /users/oauth/:provider` 302s the browser here). Embeds this bond's
 * client id and scope (`read_user` — exactly what `verify`'s
 * `GET /api/v4/user` call requires) plus the caller's CSRF `state` and PKCE
 * S256 challenge, so no consumer hardcodes GitLab knowledge. The authorize
 * endpoint defaults to GitLab.com but can be overridden via
 * `OAUTH_GITLAB_AUTHORIZE_URL` for self-managed GitLab instances.
 *
 * @param params - State, PKCE challenge, and optional redirect URI.
 * @returns The GitLab authorize URL, or `null` when `OAUTH_GITLAB_CLIENT_ID` is unset.
 */
export const getAuthorizeUrl: OAuthAuthorizeUrlBuilder = ({
  redirectUri,
  state,
  codeChallenge,
  codeChallengeMethod,
}) => {
  const clientId = process.env.OAUTH_GITLAB_CLIENT_ID
  if (!clientId) {
    return null
  }
  const url = new URL(process.env.OAUTH_GITLAB_AUTHORIZE_URL || DEFAULT_AUTHORIZE_URL)
  url.searchParams.set(`client_id`, clientId)
  if (redirectUri) {
    url.searchParams.set(`redirect_uri`, redirectUri)
  }
  url.searchParams.set(`response_type`, `code`)
  url.searchParams.set(`state`, state)
  url.searchParams.set(`scope`, `read_user`)
  if (codeChallenge) {
    url.searchParams.set(`code_challenge`, codeChallenge)
    url.searchParams.set(`code_challenge_method`, codeChallengeMethod ?? `S256`)
  }
  return url.toString()
}

/**
 * Verifies a GitLab OAuth code and responds with OAuth-related user props.
 *
 * The token and user-info URLs default to GitLab.com, but can be overridden
 * via `OAUTH_GITLAB_TOKEN_URL` and `OAUTH_GITLAB_USER_URL` for self-managed
 * GitLab deployments or E2E mock servers.
 *
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
    const tokenUrl = process.env.OAUTH_GITLAB_TOKEN_URL || DEFAULT_TOKEN_URL
    const userUrl = process.env.OAUTH_GITLAB_USER_URL || DEFAULT_USER_URL

    const response = await post<{
      access_token: string
      token_type: string
      scope: string
    }>(
      tokenUrl,
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

    // Defensive: a 2xx token response with no `access_token` means the
    // exchange did not actually succeed. Per the `OAuthVerifier` contract
    // that is a rejected code (`null` → consumer responds 403), never a
    // reason to blunder on and hit the user endpoint with `Bearer undefined`
    // (which would surface GitLab's 401 as a misleading 500).
    if (!token) {
      const exchangeError = (response.data as { error?: string }).error
      logger.warn('GitLab OAuth code exchange rejected', {
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
    // GitLab's token endpoint (Doorkeeper) responds HTTP 400 with
    // `{ "error": "invalid_grant" }` for a bad/expired/reused authorization
    // code — the provider AFFIRMATIVELY rejecting the code (a client-side
    // failure, not an infrastructure fault). Per the `OAuthVerifier`
    // contract return `null` (consumer responds 403 "verification failed")
    // instead of throwing, which would misreport it as a 500.
    const response = (error as { response?: { status?: number; data?: unknown } } | null)?.response
    if (response?.status === 400) {
      const providerError = (response.data as { error?: string } | undefined)?.error
      if (providerError === 'invalid_grant') {
        logger.warn('GitLab OAuth code exchange rejected', { error: providerError })
        return null
      }
    }

    const safe = sanitizeError(error, [process.env.OAUTH_GITLAB_CLIENT_SECRET, code])
    logger.error('GitLab OAuth verify error:', safe.message)
    throw safe
  }
}
