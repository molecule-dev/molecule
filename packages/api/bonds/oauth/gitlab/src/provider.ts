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

import { getLogger } from '@molecule/api-bond'
import { get, post } from '@molecule/api-http'
import type { OAuthVerifier } from '@molecule/api-oauth'

const logger = getLogger()

/** The OAuth server identifier for GitLab. */
export const serverName = `gitlab` as const

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
      },
    )

    return {
      username: `${oauthData.username}@gitlab`,
      email: (oauthData.email as string) || undefined,
      oauthServer: serverName,
      oauthId: oauthData.id ? String(oauthData.id) : ``,
      oauthData,
    }
  } catch (error) {
    logger.error('GitLab OAuth verify error:', error)
    throw error
  }
}
