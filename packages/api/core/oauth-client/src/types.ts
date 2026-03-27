/**
 * Type definitions for the oauth-client core interface.
 *
 * Defines types for consuming external OAuth 2.0 APIs — building
 * authorization URLs, exchanging codes for tokens, refreshing tokens,
 * making authenticated requests, and revoking access.
 *
 * @module
 */

/**
 * Supported OAuth 2.0 grant types.
 */
export type OAuthGrantType = 'authorization_code' | 'client_credentials' | 'refresh_token'

/**
 * Supported OAuth 2.0 response types.
 */
export type OAuthResponseType = 'code' | 'token'

/**
 * Configuration for an OAuth 2.0 provider (the external service).
 */
export interface OAuthConfig {
  /** Unique identifier for this provider configuration. */
  id: string

  /** OAuth 2.0 client ID. */
  clientId: string

  /** OAuth 2.0 client secret. */
  clientSecret: string

  /** Authorization endpoint URL. */
  authorizationUrl: string

  /** Token endpoint URL. */
  tokenUrl: string

  /** Token revocation endpoint URL, if supported. */
  revocationUrl?: string

  /** Redirect URI registered with the provider. */
  redirectUri: string

  /** Requested scopes. */
  scopes?: string[]

  /** Scope delimiter (defaults to `' '`). */
  scopeDelimiter?: string
}

/**
 * OAuth 2.0 access and refresh tokens.
 */
export interface OAuthTokens {
  /** The access token. */
  accessToken: string

  /** The refresh token, if granted. */
  refreshToken?: string

  /** Token type (typically `'Bearer'`). */
  tokenType: string

  /** Access token lifetime in seconds, if provided. */
  expiresIn?: number

  /** Absolute expiration timestamp (ISO 8601). */
  expiresAt?: string

  /** Granted scopes (may differ from requested scopes). */
  scope?: string
}

/**
 * Options for the authorization URL.
 */
export interface AuthorizationUrlOptions {
  /** A CSRF-prevention state value. */
  state?: string

  /** PKCE code challenge. */
  codeChallenge?: string

  /** PKCE code challenge method (`'S256'` or `'plain'`). */
  codeChallengeMethod?: 'S256' | 'plain'

  /** Additional query parameters to include. */
  additionalParams?: Record<string, string>
}

/**
 * Options for the token exchange.
 */
export interface TokenExchangeOptions {
  /** PKCE code verifier, required when a code challenge was used. */
  codeVerifier?: string

  /** Additional body parameters to include. */
  additionalParams?: Record<string, string>
}

/**
 * HTTP method for authenticated requests.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * Options for making an authenticated request to a resource server.
 */
export interface RequestOptions {
  /** HTTP method. Defaults to `'GET'`. */
  method?: HttpMethod

  /** Request headers. */
  headers?: Record<string, string>

  /** Request body (for POST/PUT/PATCH). */
  body?: unknown

  /** Content type. Defaults to `'application/json'`. */
  contentType?: string
}

/**
 * OAuth client provider interface.
 *
 * All OAuth client providers must implement this interface. Bond packages
 * provide concrete implementations that handle the OAuth 2.0 flow for
 * consuming external APIs.
 */
export interface OAuthClientProvider {
  /**
   * Builds the authorization URL that the user should be redirected to.
   *
   * @param config - The OAuth provider configuration.
   * @param options - Optional authorization URL parameters.
   * @returns The fully-qualified authorization URL.
   */
  getAuthorizationUrl(config: OAuthConfig, options?: AuthorizationUrlOptions): string

  /**
   * Exchanges an authorization code for access/refresh tokens.
   *
   * @param config - The OAuth provider configuration.
   * @param code - The authorization code received from the provider.
   * @param options - Optional token exchange parameters.
   * @returns The token set.
   */
  getToken(config: OAuthConfig, code: string, options?: TokenExchangeOptions): Promise<OAuthTokens>

  /**
   * Refreshes an expired access token using a refresh token.
   *
   * @param config - The OAuth provider configuration.
   * @param refreshToken - The refresh token.
   * @returns A new token set.
   */
  refreshToken(config: OAuthConfig, refreshToken: string): Promise<OAuthTokens>

  /**
   * Makes an authenticated HTTP request to a resource server.
   *
   * @param tokens - The current token set.
   * @param url - The resource URL.
   * @param options - Optional request parameters.
   * @returns The parsed response body.
   */
  request(tokens: OAuthTokens, url: string, options?: RequestOptions): Promise<unknown>

  /**
   * Revokes an access or refresh token.
   *
   * @param config - The OAuth provider configuration.
   * @param token - The token to revoke.
   * @returns Resolves when the token is revoked.
   */
  revokeToken(config: OAuthConfig, token: string): Promise<void>
}

/**
 * Configuration options for oauth-client providers.
 */
export interface OAuthClientConfig {
  /** Default timeout for HTTP requests in milliseconds. */
  timeout?: number

  /** Custom user-agent header for requests. */
  userAgent?: string
}
