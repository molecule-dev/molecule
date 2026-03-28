/**
 * Generic OAuth 2.0 client implementation of OAuthClientProvider.
 *
 * Uses the standard OAuth 2.0 authorization code flow with optional PKCE
 * support. All HTTP requests use Node.js built-in `fetch`. Compatible with
 * any OAuth 2.0 compliant provider (GitHub, Google, GitLab, etc.).
 *
 * @module
 */

import type {
  AuthorizationUrlOptions,
  OAuthClientProvider,
  OAuthConfig,
  OAuthTokens,
  RequestOptions,
  TokenExchangeOptions,
} from '@molecule/api-oauth-client'

import type { GenericOAuthConfig } from './types.js'

/**
 * Builds URL-encoded form body from a record.
 *
 * @param params - Key-value pairs to encode.
 * @returns URL-encoded string.
 */
const encodeForm = (params: Record<string, string>): string => {
  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')
}

/**
 * Parses a token response, handling both JSON and form-encoded responses.
 *
 * @param response - The HTTP response.
 * @returns Parsed OAuth tokens.
 */
const parseTokenResponse = async (response: Response): Promise<OAuthTokens> => {
  const contentType = response.headers.get('content-type') ?? ''
  let data: Record<string, unknown>

  if (contentType.includes('application/json')) {
    data = (await response.json()) as Record<string, unknown>
  } else {
    // Some providers (e.g. GitHub) return form-encoded
    const text = await response.text()
    data = Object.fromEntries(new URLSearchParams(text))
  }

  if (data.error) {
    const errorDesc = data.error_description ?? data.error
    throw new Error(`OAuth token error: ${String(errorDesc)}`)
  }

  const tokens: OAuthTokens = {
    accessToken: String(data.access_token ?? ''),
    tokenType: String(data.token_type ?? 'Bearer'),
  }

  if (data.refresh_token) {
    tokens.refreshToken = String(data.refresh_token)
  }

  if (data.expires_in) {
    tokens.expiresIn = Number(data.expires_in)
    tokens.expiresAt = new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
  }

  if (data.scope) {
    tokens.scope = String(data.scope)
  }

  return tokens
}

/**
 * Creates a generic OAuth 2.0 client provider.
 *
 * @param config - Optional provider configuration.
 * @returns An `OAuthClientProvider` backed by standard OAuth 2.0 flows.
 */
export const createProvider = (config: GenericOAuthConfig = {}): OAuthClientProvider => {
  const timeout = config.timeout ?? 10_000
  const userAgent = config.userAgent ?? 'molecule-oauth-client/1.0'
  const clientAuthMethod = config.clientAuthMethod ?? 'body'

  /**
   * Builds common headers for token requests.
   *
   * @param oauthConfig - The OAuth provider configuration.
   * @returns Headers object.
   */
  const buildTokenHeaders = (oauthConfig: OAuthConfig): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'User-Agent': userAgent,
    }

    if (clientAuthMethod === 'header') {
      const credentials = Buffer.from(
        `${oauthConfig.clientId}:${oauthConfig.clientSecret}`,
      ).toString('base64')
      headers['Authorization'] = `Basic ${credentials}`
    }

    return headers
  }

  return {
    getAuthorizationUrl(oauthConfig: OAuthConfig, options?: AuthorizationUrlOptions): string {
      const url = new URL(oauthConfig.authorizationUrl)
      url.searchParams.set('client_id', oauthConfig.clientId)
      url.searchParams.set('redirect_uri', oauthConfig.redirectUri)
      url.searchParams.set('response_type', 'code')

      if (oauthConfig.scopes && oauthConfig.scopes.length > 0) {
        const delimiter = oauthConfig.scopeDelimiter ?? ' '
        url.searchParams.set('scope', oauthConfig.scopes.join(delimiter))
      }

      if (options?.state) {
        url.searchParams.set('state', options.state)
      }

      if (options?.codeChallenge) {
        url.searchParams.set('code_challenge', options.codeChallenge)
        url.searchParams.set('code_challenge_method', options.codeChallengeMethod ?? 'S256')
      }

      if (options?.additionalParams) {
        for (const [key, value] of Object.entries(options.additionalParams)) {
          url.searchParams.set(key, value)
        }
      }

      return url.toString()
    },

    async getToken(
      oauthConfig: OAuthConfig,
      code: string,
      options?: TokenExchangeOptions,
    ): Promise<OAuthTokens> {
      const params: Record<string, string> = {
        grant_type: 'authorization_code',
        code,
        redirect_uri: oauthConfig.redirectUri,
      }

      if (clientAuthMethod === 'body') {
        params.client_id = oauthConfig.clientId
        params.client_secret = oauthConfig.clientSecret
      }

      if (options?.codeVerifier) {
        params.code_verifier = options.codeVerifier
      }

      if (options?.additionalParams) {
        Object.assign(params, options.additionalParams)
      }

      const response = await fetch(oauthConfig.tokenUrl, {
        method: 'POST',
        headers: buildTokenHeaders(oauthConfig),
        body: encodeForm(params),
        signal: AbortSignal.timeout(timeout),
      })

      if (!response.ok) {
        const body = await response.text()
        throw new Error(`OAuth token request failed (${response.status}): ${body}`)
      }

      return parseTokenResponse(response)
    },

    async refreshToken(oauthConfig: OAuthConfig, refreshTokenValue: string): Promise<OAuthTokens> {
      const params: Record<string, string> = {
        grant_type: 'refresh_token',
        refresh_token: refreshTokenValue,
      }

      if (clientAuthMethod === 'body') {
        params.client_id = oauthConfig.clientId
        params.client_secret = oauthConfig.clientSecret
      }

      const response = await fetch(oauthConfig.tokenUrl, {
        method: 'POST',
        headers: buildTokenHeaders(oauthConfig),
        body: encodeForm(params),
        signal: AbortSignal.timeout(timeout),
      })

      if (!response.ok) {
        const body = await response.text()
        throw new Error(`OAuth refresh request failed (${response.status}): ${body}`)
      }

      return parseTokenResponse(response)
    },

    async request(tokens: OAuthTokens, url: string, options?: RequestOptions): Promise<unknown> {
      const method = options?.method ?? 'GET'
      const contentType = options?.contentType ?? 'application/json'

      const headers: Record<string, string> = {
        Authorization: `${tokens.tokenType} ${tokens.accessToken}`,
        'User-Agent': userAgent,
        ...options?.headers,
      }

      let body: string | undefined
      if (options?.body !== undefined) {
        headers['Content-Type'] = contentType
        body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body)
      }

      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: AbortSignal.timeout(timeout),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`OAuth request failed (${response.status}): ${text}`)
      }

      const responseContentType = response.headers.get('content-type') ?? ''
      if (responseContentType.includes('application/json')) {
        return response.json()
      }

      return response.text()
    },

    async revokeToken(oauthConfig: OAuthConfig, token: string): Promise<void> {
      if (!oauthConfig.revocationUrl) {
        throw new Error('Token revocation URL not configured for this provider.')
      }

      const params: Record<string, string> = { token }

      if (clientAuthMethod === 'body') {
        params.client_id = oauthConfig.clientId
        params.client_secret = oauthConfig.clientSecret
      }

      const response = await fetch(oauthConfig.revocationUrl, {
        method: 'POST',
        headers: buildTokenHeaders(oauthConfig),
        body: encodeForm(params),
        signal: AbortSignal.timeout(timeout),
      })

      if (!response.ok) {
        const body = await response.text()
        throw new Error(`OAuth revocation failed (${response.status}): ${body}`)
      }
    },
  }
}

/**
 * The provider implementation with default configuration.
 */
export const provider: OAuthClientProvider = createProvider()
