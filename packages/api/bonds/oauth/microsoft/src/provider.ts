/**
 * Microsoft OAuth provider implementation for molecule.dev.
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

/**
 * Thrown by `exchangeCodeForTokens` when the Microsoft identity platform
 * v2.0 token endpoint AFFIRMATIVELY rejects the authorization code or PKCE
 * verifier — HTTP 400 with `{"error":"invalid_grant"}` (e.g. AADSTS70008
 * expired/already-redeemed code, AADSTS501481 `code_verifier` mismatch).
 *
 * This is a client-side failure (or an attack), NOT an infrastructure
 * fault: `verify` catches this error and returns `null` per the
 * `OAuthVerifier` contract so the consumer responds with a clean 403
 * "verification failed" instead of a misleading 500.
 */
export class MicrosoftOAuthCodeRejectedError extends Error {
  /**
   * Creates the typed rejection error thrown for a 400 `invalid_grant`.
   *
   * @param message - Sanitized (secret-redacted) description of the rejection.
   */
  constructor(message: string) {
    super(message)
    this.name = 'MicrosoftOAuthCodeRejectedError'
  }
}

/**
 * True when an upstream HTTP error is the token endpoint affirmatively
 * rejecting the grant: HTTP 400 with `{"error":"invalid_grant"}` in the
 * body (per the `HttpError.response` shape from `@molecule/api-http`).
 *
 * Deliberately narrow: anything without a 400 `invalid_grant` response —
 * network failures, 5xx, other 400 error codes like `invalid_client`, and
 * the missing-`access_token`-on-2xx throw from `normalizeTokenResponse`
 * (Microsoft does not 200-encode failures) — stays an infrastructure error.
 */
const isInvalidGrantRejection = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false
  }
  const response = (error as { response?: { status?: number; data?: unknown } }).response
  if (!response || response.status !== 400) {
    return false
  }
  return (response.data as { error?: string } | undefined)?.error === 'invalid_grant'
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

    async exchangeCodeForTokens(code, redirectUri, codeVerifier) {
      const cfg = resolveConfig(overrides)
      // Entra REQUIRES `code_verifier` at redemption whenever the
      // authorization request carried a `code_challenge` — omitting it
      // fails with invalid_grant (AADSTS501481). PKCE is complementary to
      // the confidential-client secret, so both are sent when present.
      const body = formEncode({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        code,
        code_verifier: codeVerifier,
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
        if (isInvalidGrantRejection(error)) {
          // Microsoft AFFIRMATIVELY rejected the code/verifier (HTTP 400
          // invalid_grant: expired/redeemed code, PKCE mismatch). A client
          // mistake or an attack — not an outage — so warn (not error) and
          // throw the typed rejection for `verify` to map to `null`.
          logger.warn('Microsoft OAuth token exchange rejected (invalid_grant):', safe.message)
          throw new MicrosoftOAuthCodeRejectedError(safe.message)
        }
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
 * Builds the Microsoft authorization URL for OAuth initiation
 * (`GET /users/oauth/:provider` 302s the browser here) per the core
 * `OAuthAuthorizeUrlBuilder` contract. Embeds this bond's client id,
 * default scopes (`openid email profile User.Read` — exactly what
 * `verify`'s Microsoft Graph `/me` call needs), and the tenant-derived
 * authorize endpoint
 * (`https://login.microsoftonline.com/<tenant>/oauth2/v2.0/authorize`,
 * tenant from `OAUTH_MICROSOFT_TENANT_ID`, default `common`), so no
 * consumer hardcodes Microsoft knowledge.
 *
 * Includes the caller's CSRF `state`, `response_mode=query` (the v2.0
 * auth-code flow's query-string callback), and — when a `codeChallenge`
 * is supplied — the PKCE `code_challenge` + `code_challenge_method`
 * (default `S256`). PKCE with a confidential client is supported and
 * recommended by the Microsoft identity platform: the client secret and
 * `code_verifier` are complementary, and `exchangeCodeForTokens` MUST
 * then be given the matching verifier (see AADSTS501481).
 *
 * @param params - State, PKCE challenge, and optional redirect URI.
 * @returns The Microsoft authorize URL, or `null` when
 *   `OAUTH_MICROSOFT_CLIENT_ID` is unset (unconfigured).
 */
export const getAuthorizeUrl: OAuthAuthorizeUrlBuilder = ({
  redirectUri,
  state,
  codeChallenge,
  codeChallengeMethod,
}) => {
  const cfg = resolveConfig()
  if (!cfg.clientId) {
    return null
  }
  const url = new URL(authorizeEndpointFor(cfg.tenantId))
  url.searchParams.set('client_id', cfg.clientId)
  url.searchParams.set('response_type', 'code')
  if (redirectUri) {
    url.searchParams.set('redirect_uri', redirectUri)
  }
  url.searchParams.set('response_mode', 'query')
  url.searchParams.set('scope', cfg.defaultScope)
  url.searchParams.set('state', state)
  if (codeChallenge) {
    url.searchParams.set('code_challenge', codeChallenge)
    url.searchParams.set('code_challenge_method', codeChallengeMethod ?? 'S256')
  }
  return url.toString()
}

/**
 * Verifies a Microsoft OAuth code and responds with normalized
 * `OAuthUserProps` for compatibility with the core `@molecule/api-oauth`
 * `OAuthVerifier` contract — exchanges the code (passing the PKCE
 * verifier through to the token endpoint), fetches `/me` from Microsoft
 * Graph, and shapes the result.
 *
 * Returns `null` (never throws) when Microsoft AFFIRMATIVELY rejects the
 * code or verifier — the token endpoint's HTTP 400 `invalid_grant`
 * (AADSTS70008 expired/redeemed code, AADSTS501481 verifier mismatch) —
 * so the consumer responds 403 "verification failed". Infrastructure
 * failures (network, outage, malformed 2xx) still throw and surface as 500.
 *
 * @param code - The authorization code from the OAuth callback.
 * @param codeVerifier - PKCE code verifier matching the `code_challenge`
 *   sent by `getAuthorizeUrl`. Required by Microsoft at redemption
 *   whenever the authorization request carried a challenge.
 * @param redirectUri - The redirect URI used in the authorization
 *   request. Falls back to `APP_ORIGIN`.
 * @returns Normalized `OAuthUserProps`, or `null` when the provider
 *   rejected the code.
 */
export const verify: OAuthVerifier = async (
  code: string,
  codeVerifier?: string,
  redirectUri?: string,
) => {
  const effectiveRedirect = redirectUri || process.env.APP_ORIGIN || ''
  let tokenSet: MicrosoftTokenSet
  try {
    tokenSet = await provider.exchangeCodeForTokens(code, effectiveRedirect, codeVerifier)
  } catch (error) {
    if (error instanceof MicrosoftOAuthCodeRejectedError) {
      // Provider affirmatively rejected the code/verifier — per the
      // OAuthVerifier contract this is a null return (consumer 403), not
      // a throw (which would misreport a client mistake as a 500). Already
      // logged at warn level by exchangeCodeForTokens.
      return null
    }
    throw error
  }
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
