/**
 * GitHub OAuth provider implementation.
 *
 * ## Setup
 *
 * 1. Log into [GitHub](https://github.com) (or sign up).
 *
 * 2. Open the [GitHub OAuth Apps](https://github.com/settings/developers) page found under "Settings -> Developer Settings -> OAuth Apps".
 *
 * 3. Create a new OAuth app.
 *
 * 4. Fill out your app's information. You can create an OAuth app for development and another for production.
 *
 *     - For development, your "Authorization callback URL" should be your app's local development origin, e.g. `http://localhost:3000`.
 *
 *     - For production, your "Authorization callback URL" should be your app's production development origin, e.g. `https://app.your-app.com`. This should typically match your API's `APP_ORIGIN` environment variable.
 *
 * 5. Once you've registered your OAuth app, you should be taken to the OAuth app's page with the client ID and a button to generate a new client secret.
 *
 *     5.1. Set the client ID to your API's `OAUTH_GITHUB_CLIENT_ID` environment variable and your app's `REACT_APP_OAUTH_GITHUB_CLIENT_ID` environment variable.
 *
 *     5.2. Generate a client secret and set it to your API's `OAUTH_GITHUB_CLIENT_SECRET` environment variable.
 *
 * 6. Upload your app's logo if you have one.
 *
 * 7. Click "Update application" at the bottom.
 *
 * 8. Restart your API and/or rebuild your app so that they have the environment variables.
 *
 * > **Your users should now be able to log in via GitHub!**
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
import { get, post } from '@molecule/api-http'
import type { OAuthVerifier } from '@molecule/api-oauth'

const logger = getLogger()

/** The OAuth server identifier for GitHub. */
export const serverName = `github` as const

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

/** Default GitHub access-token endpoint. Overridable via `OAUTH_GITHUB_TOKEN_URL`. */
const DEFAULT_TOKEN_URL = `https://github.com/login/oauth/access_token`
/** Default GitHub user-info endpoint. Overridable via `OAUTH_GITHUB_USER_URL`. */
const DEFAULT_USER_URL = `https://api.github.com/user`

/**
 * Exchanges a GitHub OAuth authorization code for an access token, then
 * fetches the authenticated user's profile from the GitHub API.
 *
 * The token and user-info URLs default to GitHub.com, but can be overridden
 * via `OAUTH_GITHUB_TOKEN_URL` and `OAUTH_GITHUB_USER_URL` for GitHub
 * Enterprise deployments or E2E mock servers.
 *
 * @param code - The authorization code from the OAuth callback.
 * @param codeVerifier - The PKCE code verifier (if PKCE was used in the auth request).
 * @returns An `OAuthUserInfo` with the user's GitHub username, email, and OAuth ID.
 */
export const verify: OAuthVerifier = async (code: string, codeVerifier?: string) => {
  try {
    const tokenUrl = process.env.OAUTH_GITHUB_TOKEN_URL || DEFAULT_TOKEN_URL
    const userUrl = process.env.OAUTH_GITHUB_USER_URL || DEFAULT_USER_URL

    const response = await post<{
      access_token: string
      token_type: string
      scope: string
    }>(
      tokenUrl,
      {
        client_id: process.env.OAUTH_GITHUB_CLIENT_ID,
        client_secret: process.env.OAUTH_GITHUB_CLIENT_SECRET,
        code,
        code_verifier: codeVerifier,
        grant_type: `authorization_code`,
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

    // GitHub's `/user.email` is the user's *public profile* email, and GitHub
    // only permits a **verified** address to be set as the public email — an
    // unverified address can never appear here. So a present `/user.email` is
    // verified by construction. (A null public email yields `undefined` here →
    // unverified, which is the safe default.)
    const emailVerified = email !== undefined

    return {
      username: `${oauthData.login}@github`,
      email,
      emailVerified,
      oauthServer: serverName,
      oauthId: oauthData.id ? String(oauthData.id) : ``,
      oauthData,
    }
  } catch (error) {
    const safe = sanitizeError(error, [process.env.OAUTH_GITHUB_CLIENT_SECRET, code])
    logger.error('GitHub OAuth verify error:', safe.message)
    throw safe
  }
}
