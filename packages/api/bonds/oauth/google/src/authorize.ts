/**
 * Google OAuth authorization-URL builder for molecule.dev.
 *
 * Builds the URL the user's browser is redirected to so Google can
 * authenticate them and send back an authorization code
 * (`GET /users/oauth/:provider` → 302 to this URL).
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when authorize.js is imported directly
// (not through the package barrel).
import './secrets.js'

import type { OAuthAuthorizeUrlBuilder } from '@molecule/api-oauth'

/** Default Google authorization endpoint. Overridable via `OAUTH_GOOGLE_AUTHORIZE_URL`. */
const DEFAULT_AUTHORIZE_URL = `https://accounts.google.com/o/oauth2/v2/auth`

/**
 * Builds the Google authorization URL for OAuth initiation
 * (`GET /users/oauth/:provider` 302s the browser here). Embeds this bond's
 * client id and OpenID scopes (`openid email profile` — exactly what
 * `verify`'s OpenID userinfo call reads: `sub`, `email`, `email_verified`,
 * and profile fields) plus the caller's CSRF `state` and PKCE S256
 * challenge, so no consumer hardcodes Google knowledge. The authorize
 * endpoint defaults to Google's v2 endpoint but can be overridden via
 * `OAUTH_GOOGLE_AUTHORIZE_URL` for proxy deployments or E2E mock OAuth
 * servers (consistent with `OAUTH_GOOGLE_TOKEN_URL` / `OAUTH_GOOGLE_USER_URL`).
 *
 * Deliberately does NOT request `access_type=offline`: `verify` uses the
 * access token exactly once (a single userinfo fetch) and never stores or
 * uses a refresh token, so requesting standing offline access would ask
 * users to consent to access this bond never exercises. Do not "helpfully"
 * add it back unless the bond actually starts persisting and refreshing
 * tokens.
 *
 * @param params - State, PKCE challenge, and optional redirect URI.
 * @returns The Google authorize URL, or `null` when `OAUTH_GOOGLE_CLIENT_ID` is unset.
 */
export const getAuthorizeUrl: OAuthAuthorizeUrlBuilder = ({
  redirectUri,
  state,
  codeChallenge,
  codeChallengeMethod,
}) => {
  const clientId = process.env.OAUTH_GOOGLE_CLIENT_ID
  if (!clientId) {
    return null
  }
  const url = new URL(process.env.OAUTH_GOOGLE_AUTHORIZE_URL || DEFAULT_AUTHORIZE_URL)
  url.searchParams.set(`client_id`, clientId)
  if (redirectUri) {
    url.searchParams.set(`redirect_uri`, redirectUri)
  }
  url.searchParams.set(`response_type`, `code`)
  url.searchParams.set(`scope`, `openid email profile`)
  url.searchParams.set(`state`, state)
  if (codeChallenge) {
    url.searchParams.set(`code_challenge`, codeChallenge)
    url.searchParams.set(`code_challenge_method`, codeChallengeMethod ?? `S256`)
  }
  return url.toString()
}
