# @molecule/api-oauth-client-generic

Generic OAuth 2.0 client provider for molecule.dev.

Implements the standard OAuth 2.0 authorization code flow with PKCE support,
using Node.js built-in `fetch` for HTTP requests. Compatible with any
OAuth 2.0 compliant provider (GitHub, Google, GitLab, Slack, etc.).

## Quick Start

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

## Type
`provider`

## Installation
```bash
npm install @molecule/api-oauth-client-generic @molecule/api-oauth-client
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

## Core Interface
Implements `@molecule/api-oauth-client` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-oauth-client'
import { provider } from '@molecule/api-oauth-client-generic'

export function setupOauthClientGeneric(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-oauth-client` ^1.0.0

### Runtime Dependencies

- `@molecule/api-oauth-client`

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual "connect account" screens/flows, and check
every box off one by one. A box you can't check is an integration bug to
fix — not a skip. The third-party CONSENT SCREEN cannot be driven in-sandbox,
so verify the token lifecycle + API-call wiring you own (authorize →
callback → `getToken` → token store → `refreshToken` → `request`), stubbing
the provider bond or the token endpoint where the real grant would occur:
- [ ] Connecting a third-party account from the UI runs
  authorize→callback→`getToken` and STORES the returned `OAuthTokens`
  (`accessToken` + `refreshToken`) server-side keyed to the authenticated
  user; the connection then shows as "connected" in the UI.
- [ ] An authenticated call to the third-party API via `request(tokens, url)`
  using the STORED token succeeds and its result appears in the app (bond a
  stub/test provider if available, else assert `request` is invoked with the
  stored `accessToken` — never a hardcoded or browser-supplied one).
- [ ] Token REFRESH works: an expired `accessToken` (force/simulate expiry
  via `expiresAt`) is transparently refreshed with `refreshToken` and the
  call is RETRIED — confirm exactly ONE refresh + a stored-token update, not
  an auth error surfaced to the user (`request` does not auto-refresh; the
  caller's refresh-and-retry loop must).
- [ ] Disconnecting revokes/removes the stored tokens (`revokeToken` + delete
  from the store) and the connection no longer works — a subsequent API call
  fails until the account is reconnected.
- [ ] SECURITY: `accessToken`/`refreshToken` + `clientSecret` live
  server-side only (encrypted at rest ideally) and are NEVER sent to the
  browser — the client only ever receives the authorization URL and returns
  the `code`.
- [ ] Tokens are scoped per user: user A's stored connection cannot be used
  to act as user B (the store is keyed by user id; handlers load only the
  caller's own tokens).
- [ ] The callback verifies `state` (CSRF): a per-session random `state` sent
  on `getAuthorizationUrl` must match on the callback, and a missing or
  mismatched `state` is rejected BEFORE any token exchange.
