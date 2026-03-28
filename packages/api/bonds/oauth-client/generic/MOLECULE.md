# @molecule/api-oauth-client-generic

Generic OAuth 2.0 client provider for molecule.dev.

Implements the standard OAuth 2.0 authorization code flow with PKCE support,
using Node.js built-in `fetch` for HTTP requests. Compatible with any
OAuth 2.0 compliant provider (GitHub, Google, GitLab, Slack, etc.).

## Type
`provider`

## Installation
```bash
npm install @molecule/api-oauth-client-generic
```

## Usage

```typescript
import { setProvider, getAuthorizationUrl, getToken } from '@molecule/api-oauth-client'
import { provider } from '@molecule/api-oauth-client-generic'

setProvider(provider)

const config = {
  id: 'github',
  clientId: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  authorizationUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  redirectUri: 'https://myapp.com/callback',
  scopes: ['user', 'repo'],
}

const authUrl = getAuthorizationUrl(config, { state: 'random-csrf' })
// Redirect user to authUrl, then on callback:
const tokens = await getToken(config, code)
```

## API

### Interfaces

#### `GenericOAuthConfig`

Configuration options for the generic OAuth 2.0 client provider.

```typescript
interface GenericOAuthConfig {
  /** Default timeout for HTTP requests in milliseconds. Defaults to `10_000`. */
  timeout?: number

  /** Custom user-agent header sent with all requests. */
  userAgent?: string

  /**
   * How the client credentials are sent in token requests.
   * - `'body'` — client_id and client_secret in the POST body (default).
   * - `'header'` — HTTP Basic auth header.
   */
  clientAuthMethod?: 'body' | 'header'
}
```

### Functions

#### `createProvider(config)`

Creates a generic OAuth 2.0 client provider.

```typescript
function createProvider(config?: GenericOAuthConfig): OAuthClientProvider
```

- `config` — Optional provider configuration.

**Returns:** An `OAuthClientProvider` backed by standard OAuth 2.0 flows.

### Constants

#### `provider`

The provider implementation with default configuration.

```typescript
const provider: OAuthClientProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-oauth-client` ^1.0.0
