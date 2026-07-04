import crypto from 'node:crypto'

import { get } from '@molecule/api-bond'
import { get as getConfig } from '@molecule/api-config'
import { t } from '@molecule/api-i18n'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import * as authorization from '../authorization.js'

/** TTL for the OAuth `state` + PKCE `verifier` cookies (one flow's lifetime). */
const OAUTH_COOKIE_MAX_AGE_MS = 5 * 60 * 1000

/**
 * Validate a client-supplied return path so the post-login redirect can only
 * land somewhere on the app's own origin. Accepts a same-origin absolute path
 * (`/login`), rejects anything protocol-relative (`//evil.com`), scheme-ful
 * (`https://…`), or backslash-tricky — those would turn the `redirect_uri` we
 * send the provider into an open redirect.
 *
 * @param value - The raw `redirect_to` query value.
 * @returns The validated path, or `''` (the app origin root) when invalid/absent.
 */
const sanitizeRedirectPath = (value: unknown): string => {
  if (typeof value !== 'string' || value === '') {
    return ''
  }
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return ''
  }
  return value
}

/**
 * OAuth initiation — `GET /users/oauth/:provider`.
 *
 * The missing first half of the OAuth flow whose second half is
 * `logInOAuth` (`POST /users/log-in/oauth`): generates the CSRF `state` and
 * a per-session PKCE S256 verifier, stores BOTH in httpOnly cookies (the
 * exact names + attributes `logInOAuth` reads and clears —
 * `getAuthCookieName('oauth_state')` / `('oauth_verifier')` with
 * `getAuthCookieOptions()`), then 302-redirects the browser to the
 * provider's authorization URL.
 *
 * Provider knowledge stays in the bond: the handler asks the bonded OAuth
 * provider (`get('oauth', :provider)`) for its authorize URL via its
 * optional `getAuthorizeUrl` builder (see `@molecule/api-oauth`). A
 * provider that is not bonded, lacks the builder, or is unconfigured
 * (builder returns `null`, e.g. missing client id) yields a clean 404/503 —
 * never a crash.
 *
 * The `redirect_uri` sent to the provider is `APP_ORIGIN` plus an optional
 * validated same-origin `redirect_to` path from the query string (the page
 * that initiated the flow, e.g. `/login`, where the app's OAuth callback
 * handling is mounted). The path is sanitized so this can never become an
 * open redirect; the state cookie — not `redirect_uri` — is the CSRF
 * control.
 *
 * @returns A request handler that responds `302` with a `Location` header
 * pointing at the provider's authorization URL.
 */
export const oauthAuthorize = () => {
  return async (req: MoleculeRequest, res: MoleculeResponse) => {
    const provider = req.params?.provider

    if (!provider) {
      return {
        statusCode: 400,
        body: { error: t('user.error.badRequest'), errorKey: 'user.error.badRequest' },
      }
    }

    const oauthProvider = get<{
      getAuthorizeUrl?: (params: {
        redirectUri?: string
        state: string
        codeChallenge?: string
        codeChallengeMethod?: 'S256' | 'plain'
      }) => string | null
    }>('oauth', provider)

    if (!oauthProvider?.getAuthorizeUrl) {
      return {
        statusCode: 404,
        body: {
          error: t('user.error.oauthServerNotConfigured', { server: provider }),
          errorKey: 'user.error.oauthServerNotConfigured',
        },
      }
    }

    // CSRF state — the callback (`logInOAuth`) requires the provider-echoed
    // `state` to equal this cookie (timing-safe), so a forged cross-site
    // callback can't plant a session.
    const state = crypto.randomBytes(32).toString('hex')

    // Per-request PKCE (S256). The verifier binds the authorization code to
    // THIS session — the only control that blocks authorization-code
    // injection (RFC 9700 §2.1); `state` binds the session, NOT the code. The
    // verifier lives in an httpOnly cookie read SERVER-SIDE by `logInOAuth`,
    // never exposed to page JavaScript or trusted from the request body.
    const codeVerifier = crypto.randomBytes(32).toString('base64url')
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')

    // SET with the exact same name + attribute source `logInOAuth` CLEARS with
    // (one source of truth — a mismatched attribute leaves an undeletable
    // cookie): `__Host-` names in production, `SameSite=None; Partitioned` in
    // the cross-site live preview, plain Lax cookies in top-level dev.
    const cookieOptions = authorization.getAuthCookieOptions()
    res.cookie(authorization.getAuthCookieName('oauth_state'), state, {
      ...cookieOptions,
      httpOnly: true,
      maxAge: OAUTH_COOKIE_MAX_AGE_MS,
    })
    res.cookie(authorization.getAuthCookieName('oauth_verifier'), codeVerifier, {
      ...cookieOptions,
      httpOnly: true,
      maxAge: OAUTH_COOKIE_MAX_AGE_MS,
    })

    // redirect_uri = the app origin + a validated same-origin path. When
    // APP_ORIGIN is unset, omit redirect_uri entirely so the provider falls
    // back to its registered callback URL (standard OAuth behavior).
    const appOrigin = getConfig<string>('APP_ORIGIN', '')
    const redirectTo = sanitizeRedirectPath(req.query?.redirect_to)
    const redirectUri = appOrigin ? `${appOrigin}${redirectTo}` : undefined

    const authorizeUrl = oauthProvider.getAuthorizeUrl({
      redirectUri,
      state,
      codeChallenge,
      codeChallengeMethod: 'S256',
    })

    if (!authorizeUrl) {
      // Bonded but unconfigured (e.g. client id env var unset) — an
      // operator problem, not a client one.
      return {
        statusCode: 503,
        body: {
          error: t('user.error.oauthServerNotConfigured', { server: provider }),
          errorKey: 'user.error.oauthServerNotConfigured',
        },
      }
    }

    return {
      statusCode: 302,
      headers: { Location: authorizeUrl },
      body: undefined,
    }
  }
}
