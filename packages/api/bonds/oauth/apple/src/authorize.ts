/**
 * Builds the Sign-in-with-Apple authorization URL.
 *
 * @module
 */

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
