/**
 * Microsoft OAuth provider implementation for molecule.dev.
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
import { get, post } from '@molecule/api-http'
import type { OAuthVerifier } from '@molecule/api-oauth'

import { verifyMicrosoftIdToken } from './jwks.js'
import type {
  MicrosoftOAuthConfig,
  MicrosoftTokenSet,
  OAuthProvider,
  OAuthUserInfo,
} from './types.js'

const logger = getLogger()

/** The OAuth server identifier for Microsoft. */
export const serverName = `microsoft` as const

/** Default OAuth scopes when none are supplied. */
export const DEFAULT_SCOPE = `openid email profile User.Read`

/** Microsoft Graph endpoint for the signed-in user. */
export const GRAPH_ME_URL = `https://graph.microsoft.com/v1.0/me`

const tokenEndpointFor = (tenantId: string): string =>
  `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`

const authorizeEndpointFor = (tenantId: string): string =>
  `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/authorize`

/**
 * Resolve effective configuration by layering an explicit config over
 * environment variables. Pure — does no I/O.
 *
 * @param overrides - Partial configuration to merge over env defaults.
 * @returns The fully-resolved configuration.
 */
export const resolveConfig = (
  overrides?: MicrosoftOAuthConfig,
): { tenantId: string; clientId: string; clientSecret: string; defaultScope: string } => {
  const tenantId = overrides?.tenantId || process.env.OAUTH_MICROSOFT_TENANT_ID || `common`
  const clientId = overrides?.clientId || process.env.OAUTH_MICROSOFT_CLIENT_ID || ``
  const clientSecret = overrides?.clientSecret || process.env.OAUTH_MICROSOFT_CLIENT_SECRET || ``
  const defaultScope = overrides?.defaultScope || DEFAULT_SCOPE
  return { tenantId, clientId, clientSecret, defaultScope }
}

/**
 * Strip client secrets and refresh tokens from an error before logging
 * or rethrowing. Mutates and returns a new error-like object.
 *
 * @param error - The original error.
 * @param secrets - Sensitive strings to redact.
 * @returns A sanitized error suitable for logging or surfacing.
 */
export const sanitizeError = (error: unknown, secrets: string[]): Error => {
  // Only redact strings of meaningful length — short tokens like
  // single-char test fixtures would otherwise scrub legitimate prose.
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
  // Carry over response status code only — never the body, which may
  // echo the secret.
  if (error && typeof error === 'object') {
    const maybeResponse = (error as { response?: { status?: number } }).response
    if (maybeResponse && typeof maybeResponse.status === 'number') {
      ;(sanitized as Error & { status?: number }).status = maybeResponse.status
    }
  }
  return sanitized
}

const formEncode = (record: Record<string, string | undefined>): string => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'string' && value.length > 0) {
      params.append(key, value)
    }
  }
  return params.toString()
}

interface MicrosoftTokenResponse {
  access_token?: string
  id_token?: string
  refresh_token?: string
  token_type?: string
  expires_in?: number
  scope?: string
}

const normalizeTokenResponse = (data: MicrosoftTokenResponse): MicrosoftTokenSet => {
  if (!data.access_token) {
    throw new Error('Microsoft OAuth token response missing access_token')
  }
  return {
    accessToken: data.access_token,
    idToken: data.id_token,
    refreshToken: data.refresh_token,
    tokenType: data.token_type || 'Bearer',
    expiresIn: typeof data.expires_in === 'number' ? data.expires_in : undefined,
    scope: data.scope,
  }
}

interface MicrosoftGraphMeResponse {
  id?: string
  mail?: string | null
  userPrincipalName?: string | null
  displayName?: string | null
  givenName?: string | null
  surname?: string | null
}

const normalizeGraphMe = (data: MicrosoftGraphMeResponse): OAuthUserInfo => {
  const id = data.id ? String(data.id) : ''
  const email = data.mail || data.userPrincipalName || undefined
  const name =
    data.displayName || [data.givenName, data.surname].filter(Boolean).join(' ').trim() || undefined
  return {
    id,
    email: email ?? undefined,
    name: name ?? undefined,
    // Microsoft Graph does not return a profile photo URL on /me;
    // fetching `/me/photo/$value` requires extra permissions and a
    // binary response — left intentionally undefined here.
    picture: undefined,
  }
}

/**
 * Build a Microsoft OAuth provider with optional config overrides.
 *
 * @param overrides - Optional configuration overrides.
 * @returns A typed `OAuthProvider`.
 */
export const createMicrosoftProvider = (overrides?: MicrosoftOAuthConfig): OAuthProvider => {
  const provider: OAuthProvider = {
    serverName,

    getAuthorizationUrl({ state, redirectUri, scope }) {
      const cfg = resolveConfig(overrides)
      const params = new URLSearchParams({
        client_id: cfg.clientId,
        response_type: 'code',
        redirect_uri: redirectUri,
        response_mode: 'query',
        scope: scope || cfg.defaultScope,
        state,
      })
      return `${authorizeEndpointFor(cfg.tenantId)}?${params.toString()}`
    },

    async exchangeCodeForTokens(code, redirectUri) {
      const cfg = resolveConfig(overrides)
      const body = formEncode({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      })
      try {
        const response = await post<MicrosoftTokenResponse>(tokenEndpointFor(cfg.tenantId), body, {
          headers: {
            accept: 'application/json',
            'content-type': 'application/x-www-form-urlencoded',
          },
          timeout: 15_000,
        })
        return normalizeTokenResponse(response.data)
      } catch (error) {
        const safe = sanitizeError(error, [cfg.clientSecret, code])
        logger.error('Microsoft OAuth token exchange error:', safe.message)
        throw safe
      }
    },

    async getUserInfo(accessToken) {
      const cfg = resolveConfig(overrides)
      try {
        const { data } = await get<MicrosoftGraphMeResponse>(GRAPH_ME_URL, {
          headers: {
            accept: 'application/json',
            authorization: `Bearer ${accessToken}`,
          },
          timeout: 15_000,
        })
        return normalizeGraphMe(data)
      } catch (error) {
        const safe = sanitizeError(error, [cfg.clientSecret, accessToken])
        logger.error('Microsoft Graph /me error:', safe.message)
        throw safe
      }
    },

    async refreshAccessToken(refreshToken) {
      const cfg = resolveConfig(overrides)
      const body = formEncode({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      })
      try {
        const response = await post<MicrosoftTokenResponse>(tokenEndpointFor(cfg.tenantId), body, {
          headers: {
            accept: 'application/json',
            'content-type': 'application/x-www-form-urlencoded',
          },
          timeout: 15_000,
        })
        return normalizeTokenResponse(response.data)
      } catch (error) {
        const safe = sanitizeError(error, [cfg.clientSecret, refreshToken])
        logger.error('Microsoft OAuth refresh error:', safe.message)
        throw safe
      }
    },

    async verifyIdToken(idToken) {
      const cfg = resolveConfig(overrides)
      try {
        return await verifyMicrosoftIdToken(idToken, {
          tenantId: cfg.tenantId,
          audience: cfg.clientId,
        })
      } catch (error) {
        const safe = sanitizeError(error, [cfg.clientSecret])
        logger.error('Microsoft ID token verify error:', safe.message)
        throw safe
      }
    },
  }
  return provider
}

/**
 * Default Microsoft OAuth provider, configured from environment.
 *
 * Use `createMicrosoftProvider()` with explicit config for tests or
 * multi-tenant apps that need per-request configuration.
 */
export const provider: OAuthProvider = createMicrosoftProvider()

/**
 * Verifies a Microsoft OAuth code and responds with normalized
 * `OAuthUserProps` for compatibility with the core `@molecule/api-oauth`
 * `OAuthVerifier` contract — exchanges the code, fetches `/me` from
 * Microsoft Graph, and shapes the result.
 *
 * @param code - The authorization code from the OAuth callback.
 * @param _codeVerifier - PKCE code verifier (currently unused; reserved
 *   for forward compatibility — Microsoft confidential clients use the
 *   client secret rather than PKCE).
 * @param redirectUri - The redirect URI used in the authorization
 *   request. Falls back to `APP_ORIGIN`.
 * @returns Normalized `OAuthUserProps`.
 */
export const verify: OAuthVerifier = async (
  code: string,
  _codeVerifier?: string,
  redirectUri?: string,
) => {
  const effectiveRedirect = redirectUri || process.env.APP_ORIGIN || ''
  const tokenSet = await provider.exchangeCodeForTokens(code, effectiveRedirect)
  const userInfo = await provider.getUserInfo(tokenSet.accessToken)
  const oauthData: Record<string, unknown> = { ...userInfo }
  return {
    username: `${userInfo.email || userInfo.id}@${serverName}`,
    name: userInfo.name,
    email: userInfo.email,
    // Microsoft Graph `/me` exposes no email-verification signal (neither
    // `mail` nor `userPrincipalName` carries a verified flag, and consumer
    // MSA accounts don't surface `email_verified`). We cannot affirm mailbox
    // ownership, so report unverified — the conservative, safe default.
    emailVerified: false,
    oauthServer: serverName,
    oauthId: userInfo.id || '',
    oauthData,
  }
}
