# @molecule/api-oauth-client

Provider-agnostic OAuth 2.0 client interface for molecule.dev.

Defines the `OAuthClientProvider` interface for consuming external OAuth 2.0
APIs — building authorization URLs, exchanging codes for tokens, refreshing
tokens, making authenticated requests, and revoking access. Bond packages
(generic OAuth2, etc.) implement this interface. Application code uses the
convenience functions (`getAuthorizationUrl`, `getToken`, `refreshToken`,
`request`, `revokeToken`) which delegate to the bonded provider.

## Quick Start

```typescript
import { setProvider, getAuthorizationUrl, getToken } from '@molecule/api-oauth-client'
import { provider as genericOAuth } from '@molecule/api-oauth-client-generic'

setProvider(genericOAuth)

const config = {
  id: 'github',
  clientId: 'abc123',
  clientSecret: 'secret',
  authorizationUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  redirectUri: 'https://myapp.com/callback',
  scopes: ['user', 'repo'],
}

const authUrl = getAuthorizationUrl(config, { state: 'csrf-token' })
const tokens = await getToken(config, 'authorization-code')
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-oauth-client
```

## API

### Interfaces

#### `AuthorizationUrlOptions`

Options for the authorization URL.

```typescript
interface AuthorizationUrlOptions {
  /** A CSRF-prevention state value. */
  state?: string

  /** PKCE code challenge. */
  codeChallenge?: string

  /** PKCE code challenge method (`'S256'` or `'plain'`). */
  codeChallengeMethod?: 'S256' | 'plain'

  /** Additional query parameters to include. */
  additionalParams?: Record<string, string>
}
```

#### `OAuthClientConfig`

Configuration options for oauth-client providers.

```typescript
interface OAuthClientConfig {
  /** Default timeout for HTTP requests in milliseconds. */
  timeout?: number

  /** Custom user-agent header for requests. */
  userAgent?: string
}
```

#### `OAuthClientProvider`

OAuth client provider interface.

All OAuth client providers must implement this interface. Bond packages
provide concrete implementations that handle the OAuth 2.0 flow for
consuming external APIs.

```typescript
interface OAuthClientProvider {
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
```

#### `OAuthConfig`

Configuration for an OAuth 2.0 provider (the external service).

```typescript
interface OAuthConfig {
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
```

#### `OAuthTokens`

OAuth 2.0 access and refresh tokens.

```typescript
interface OAuthTokens {
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
```

#### `RequestOptions`

Options for making an authenticated request to a resource server.

```typescript
interface RequestOptions {
  /** HTTP method. Defaults to `'GET'`. */
  method?: HttpMethod

  /** Request headers. */
  headers?: Record<string, string>

  /** Request body (for POST/PUT/PATCH). */
  body?: unknown

  /** Content type. Defaults to `'application/json'`. */
  contentType?: string
}
```

#### `TokenExchangeOptions`

Options for the token exchange.

```typescript
interface TokenExchangeOptions {
  /** PKCE code verifier, required when a code challenge was used. */
  codeVerifier?: string

  /** Additional body parameters to include. */
  additionalParams?: Record<string, string>
}
```

### Types

#### `HttpMethod`

HTTP method for authenticated requests.

```typescript
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
```

#### `OAuthGrantType`

Supported OAuth 2.0 grant types.

```typescript
type OAuthGrantType = 'authorization_code' | 'client_credentials' | 'refresh_token'
```

#### `OAuthResponseType`

Supported OAuth 2.0 response types.

```typescript
type OAuthResponseType = 'code' | 'token'
```

### Functions

#### `getAuthorizationUrl(config, options)`

Builds the authorization URL that the user should be redirected to.

```typescript
function getAuthorizationUrl(config: OAuthConfig, options?: AuthorizationUrlOptions): string
```

- `config` — The OAuth provider configuration.
- `options` — Optional authorization URL parameters.

**Returns:** The fully-qualified authorization URL.

#### `getProvider()`

Retrieves the bonded OAuth client provider, throwing if none is configured.

```typescript
function getProvider(): OAuthClientProvider
```

**Returns:** The bonded OAuth client provider.

#### `getToken(config, code, options)`

Exchanges an authorization code for access/refresh tokens.

```typescript
function getToken(config: OAuthConfig, code: string, options?: TokenExchangeOptions): Promise<OAuthTokens>
```

- `config` — The OAuth provider configuration.
- `code` — The authorization code received from the provider.
- `options` — Optional token exchange parameters.

**Returns:** The token set.

#### `hasProvider()`

Checks whether an OAuth client provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if an OAuth client provider is bonded.

#### `refreshToken(config, token)`

Refreshes an expired access token using a refresh token.

```typescript
function refreshToken(config: OAuthConfig, token: string): Promise<OAuthTokens>
```

- `config` — The OAuth provider configuration.
- `token` — The refresh token string.

**Returns:** A new token set.

#### `request(tokens, url, options)`

Makes an authenticated HTTP request to a resource server.

```typescript
function request(tokens: OAuthTokens, url: string, options?: RequestOptions): Promise<unknown>
```

- `tokens` — The current token set.
- `url` — The resource URL.
- `options` — Optional request parameters.

**Returns:** The parsed response body.

#### `revokeToken(config, token)`

Revokes an access or refresh token.

```typescript
function revokeToken(config: OAuthConfig, token: string): Promise<void>
```

- `config` — The OAuth provider configuration.
- `token` — The token to revoke.

**Returns:** Resolves when the token is revoked.

#### `setProvider(provider)`

Registers an OAuth client provider as the active singleton. Called by bond
packages during application startup.

```typescript
function setProvider(provider: OAuthClientProvider): void
```

- `provider` — The OAuth client provider implementation to bond.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
