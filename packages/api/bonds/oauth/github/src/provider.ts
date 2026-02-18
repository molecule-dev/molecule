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
 * Exchanges a GitHub OAuth authorization code for an access token, then
 * fetches the authenticated user's profile from the GitHub API.
 *
 * @param code - The authorization code from the OAuth callback.
 * @param codeVerifier - The PKCE code verifier (if PKCE was used in the auth request).
 * @returns An `OAuthUserInfo` with the user's GitHub username, email, and OAuth ID.
 */
export const verify: OAuthVerifier = async (code: string, codeVerifier?: string) => {
  try {
    const response = await post<{
      access_token: string
      token_type: string
      scope: string
    }>(
      `https://github.com/login/oauth/access_token`,
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
      },
    )

    const token = response.data.access_token

    const { data: oauthData } = await get<Record<string, unknown>>(`https://api.github.com/user`, {
      headers: {
        accept: `application/json`,
        authorization: `Bearer ${token}`,
      },
    })

    return {
      username: `${oauthData.login}@github`,
      email: (oauthData.email as string) || undefined,
      oauthServer: serverName,
      oauthId: oauthData.id ? String(oauthData.id) : ``,
      oauthData,
    }
  } catch (error) {
    logger.error('GitHub OAuth verify error:', error)
    throw error
  }
}
