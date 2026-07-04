/**
 * Builds the Sign-in-with-Apple authorization URL.
 *
 * ## Operational caveat — `response_mode=form_post`
 *
 * Apple REQUIRES `response_mode=form_post` whenever the `name`/`email`
 * scopes are requested (this bond's default scope), which means Apple
 * delivers the OAuth callback as an **HTTP POST** — `code` and `state`
 * arrive in the form body posted to `redirect_uri`, not as URL query
 * parameters. A purely client-side SPA route cannot read a POST body, so
 * deployments need a server-side callback receiver at `redirect_uri` that
 * forwards `code` + `state` into `POST /users/log-in/oauth`.
 *
 * ## No PKCE
 *
 * Apple's authorize endpoint does not support PKCE (`code_challenge` /
 * `code_challenge_method` are not recognized parameters). The
 * {@link getAuthorizeUrl} builder accepts the PKCE params required by the
 * shared `OAuthAuthorizeUrlBuilder` contract but deliberately does not emit
 * them; `form_post` (which keeps the authorization code out of the URL,
 * browser history, and referrers) is the mitigation Apple recommends instead.
 *
 * @module
 */

import type { OAuthAuthorizeUrlBuilder } from '@molecule/api-oauth'

import type { AppleAuthorizationUrlOptions } from './types.js'

/** Apple authorization endpoint. */
export const APPLE_AUTHORIZATION_URL = `https://appleid.apple.com/auth/authorize` as const

/** Default scope when callers do not specify one. */
export const DEFAULT_APPLE_SCOPE = `name email` as const

/**
 * Returns the URL to which the user agent should be redirected to start the
 * Sign-in-with-Apple flow.
 *
 * `response_mode=form_post` is the default because Apple only returns the
 * `name` and `email` scopes via form-post callbacks.
 *
 * @param options - State, redirect URI, and optional scope/nonce/response mode.
 * @returns The fully-constructed authorization URL.
 */
export const getAuthorizationUrl = ({
  state,
  redirectUri,
  scope = DEFAULT_APPLE_SCOPE,
  nonce,
  responseMode,
}: AppleAuthorizationUrlOptions): string => {
  if (!process.env.OAUTH_APPLE_CLIENT_ID) {
    throw new Error(`OAUTH_APPLE_CLIENT_ID is not configured.`)
  }

  if (!state) {
    throw new Error(`getAuthorizationUrl requires a non-empty 'state'.`)
  }

  if (!redirectUri) {
    throw new Error(`getAuthorizationUrl requires a non-empty 'redirectUri'.`)
  }

  const includesNameOrEmail = /\b(name|email)\b/.test(scope)
  const effectiveResponseMode = responseMode ?? (includesNameOrEmail ? `form_post` : `query`)

  const params = new URLSearchParams({
    client_id: process.env.OAUTH_APPLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: `code id_token`,
    response_mode: effectiveResponseMode,
    scope,
    state,
  })

  if (nonce) {
    params.set(`nonce`, nonce)
  }

  return `${APPLE_AUTHORIZATION_URL}?${params.toString()}`
}

/**
 * Builds the Sign-in-with-Apple authorization URL for OAuth initiation
 * (`GET /users/oauth/:provider` 302s the browser here). Embeds this bond's
 * client id and default scopes (`name email`) plus the caller's CSRF
 * `state`, so no consumer hardcodes Apple knowledge.
 *
 * `redirect_uri` resolves from `params.redirectUri` falling back to
 * `APP_ORIGIN` (the same fallback the token exchange uses) — Apple requires
 * an exact registered `redirect_uri` and has no registered-fallback
 * behavior, so the param is set whenever one resolves.
 *
 * `response_mode=form_post` is required by Apple for the `name`/`email`
 * scopes: the callback arrives as an HTTP POST with `code`/`state` in the
 * form body, so `redirect_uri` must point at a server-side receiver that
 * forwards them into `POST /users/log-in/oauth` (see the module JSDoc).
 *
 * Apple does not support PKCE: the `codeChallenge`/`codeChallengeMethod`
 * params are accepted (the shared initiation handler always sends them) but
 * deliberately not emitted — `form_post` keeping the code out of the URL is
 * the mitigation Apple recommends.
 *
 * @param params - State, PKCE challenge (accepted but unused), and optional redirect URI.
 * @returns The Apple authorize URL, or `null` when `OAUTH_APPLE_CLIENT_ID` is unset.
 */
export const getAuthorizeUrl: OAuthAuthorizeUrlBuilder = ({
  redirectUri,
  state,
  // Apple's authorize endpoint does not support PKCE — accept the
  // code_challenge/code_challenge_method params from the shared contract
  // (the initiation handler always sends them) but deliberately do NOT
  // emit them. `response_mode=form_post` (code delivered in a POST body,
  // never in the URL) is the mitigation Apple recommends instead.
  codeChallenge: _codeChallenge,
  codeChallengeMethod: _codeChallengeMethod,
}) => {
  const clientId = process.env.OAUTH_APPLE_CLIENT_ID
  if (!clientId) {
    return null
  }

  const url = new URL(APPLE_AUTHORIZATION_URL)
  url.searchParams.set(`client_id`, clientId)

  // Apple requires an exact registered redirect_uri (no registered-fallback
  // behavior) — resolve it from the caller or APP_ORIGIN (the same fallback
  // tokens.ts uses for the exchange) and set it whenever one resolves.
  const resolvedRedirectUri = redirectUri || process.env.APP_ORIGIN
  if (resolvedRedirectUri) {
    url.searchParams.set(`redirect_uri`, resolvedRedirectUri)
  }

  url.searchParams.set(`response_type`, `code`)
  url.searchParams.set(`response_mode`, `form_post`)
  url.searchParams.set(`scope`, DEFAULT_APPLE_SCOPE)
  url.searchParams.set(`state`, state)

  return url.toString()
}
