/**
 * X (Twitter) OAuth authorization URL builder for molecule.dev.
 *
 * Builds the URL the user's browser is redirected to for OAuth initiation
 * (`GET /users/oauth/:provider` → 302 here), embedding this bond's client id
 * and scopes so no consumer hardcodes X knowledge.
 *
 * X's OAuth 2.0 Authorization Code Flow **mandates PKCE** (S256) on every
 * authorization request — a URL built without a `code_challenge` will be
 * rejected by X. The shared initiation endpoint always supplies an S256
 * challenge, so in practice `params.codeChallenge` is always present.
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when authorize.js is imported directly
// (not through the package barrel).
import './secrets.js'

import type { OAuthAuthorizeUrlBuilder } from '@molecule/api-oauth'

/**
 * Default X (Twitter) authorization endpoint — X's currently-documented
 * authorize host (twitter.com redirects there). Overridable via
 * `OAUTH_TWITTER_AUTHORIZE_URL` (e.g. for E2E mock OAuth servers).
 */
const DEFAULT_AUTHORIZE_URL = `https://x.com/i/oauth2/authorize`

/**
 * Builds the X (Twitter) authorization URL for OAuth initiation
 * (`GET /users/oauth/:provider` 302s the browser here). Embeds this bond's
 * client id and scopes (`users.read tweet.read` — exactly what `verify`'s
 * `GET /2/users/me` requires) plus the caller's CSRF `state` and PKCE S256
 * challenge. The authorize endpoint defaults to `https://x.com/i/oauth2/authorize`
 * but can be overridden via `OAUTH_TWITTER_AUTHORIZE_URL` for E2E mocks.
 *
 * X **mandates PKCE** on every authorization request — a URL built without a
 * `code_challenge` will be rejected by X. The shared initiation endpoint
 * always supplies an S256 challenge.
 *
 * Deliberately does NOT request the `offline.access` scope: `verify` never
 * refreshes tokens — the two-hour access token is used exactly once to fetch
 * the user's profile.
 *
 * @param params - State, PKCE challenge, and optional redirect URI.
 * @returns The X authorize URL, or `null` when `OAUTH_TWITTER_CLIENT_ID` is unset.
 */
export const getAuthorizeUrl: OAuthAuthorizeUrlBuilder = ({
  redirectUri,
  state,
  codeChallenge,
  codeChallengeMethod,
}) => {
  const clientId = process.env.OAUTH_TWITTER_CLIENT_ID
  if (!clientId) {
    return null
  }
  const url = new URL(process.env.OAUTH_TWITTER_AUTHORIZE_URL || DEFAULT_AUTHORIZE_URL)
  url.searchParams.set(`response_type`, `code`)
  url.searchParams.set(`client_id`, clientId)
  if (redirectUri) {
    url.searchParams.set(`redirect_uri`, redirectUri)
  }
  url.searchParams.set(`scope`, `users.read tweet.read`)
  url.searchParams.set(`state`, state)
  if (codeChallenge) {
    url.searchParams.set(`code_challenge`, codeChallenge)
    url.searchParams.set(`code_challenge_method`, codeChallengeMethod ?? `S256`)
  }
  return url.toString()
}
