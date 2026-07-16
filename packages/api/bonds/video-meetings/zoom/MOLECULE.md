# @molecule/api-video-meetings-zoom

Zoom video meetings provider for molecule.dev.

Implements the `@molecule/api-video-meetings` interface using the Zoom
REST v2 API.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-video-meetings'
import { createProvider } from '@molecule/api-video-meetings-zoom'

// Server-to-Server OAuth (reads ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID,
// ZOOM_CLIENT_SECRET from the environment by default).
setProvider(createProvider())

// Or per-request user OAuth tokens.
setProvider(createProvider({
  accessToken: () => readUserOAuthToken(),
}))
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-video-meetings-zoom @molecule/api-secrets @molecule/api-video-meetings
```

## API

### Interfaces

#### `ZoomVideoMeetingsConfig`

Configuration for the Zoom video meetings provider.

The provider supports two authentication modes:

1. **Server-to-Server OAuth** (recommended for backend services).
   Supply `accountId`, `clientId`, and `clientSecret`. The provider
   fetches and caches an account-level access token from
   `https://zoom.us/oauth/token` using the
   `account_credentials` grant.

2. **Per-request user OAuth tokens**. Supply a synchronous or
   asynchronous `accessToken` resolver. When set, this short-circuits
   the Server-to-Server flow on every request — useful for acting as
   individual end-users with their own consent.

```typescript
interface ZoomVideoMeetingsConfig {
  /**
   * Zoom account id for the Server-to-Server OAuth app. Defaults to
   * `process.env.ZOOM_ACCOUNT_ID`.
   */
  accountId?: string

  /**
   * Zoom Server-to-Server OAuth client id. Defaults to
   * `process.env.ZOOM_CLIENT_ID`.
   */
  clientId?: string

  /**
   * Zoom Server-to-Server OAuth client secret. Defaults to
   * `process.env.ZOOM_CLIENT_SECRET`.
   */
  clientSecret?: string

  /**
   * Optional resolver for a user-OAuth access token. When provided,
   * each request uses the returned bearer token instead of fetching a
   * Server-to-Server account token.
   */
  accessToken?: () => string | Promise<string>

  /**
   * Override the Zoom API base URL. Useful for tests or proxies.
   * Defaults to `https://api.zoom.us/v2`.
   */
  baseUrl?: string

  /**
   * Override the Zoom OAuth token URL. Defaults to
   * `https://zoom.us/oauth/token`.
   */
  oauthUrl?: string

  /**
   * Optional `fetch` implementation. Defaults to the global `fetch` from
   * Node 20+. Tests may inject a mock here.
   */
  fetch?: typeof fetch

  /**
   * Optional clock function returning the current epoch milliseconds.
   * Defaults to `Date.now`. Useful for deterministic tests of token
   * expiry.
   */
  now?: () => number
}
```

### Functions

#### `createProvider(config)`

Creates a Zoom-backed {@link VideoMeetingsProvider}.

```typescript
function createProvider(config?: ZoomVideoMeetingsConfig): VideoMeetingsProvider
```

- `config` — Zoom provider configuration. When no `accessToken`

**Returns:** A fully initialised `VideoMeetingsProvider` backed by Zoom.

### Constants

#### `videoMeetingsZoomSecretDefinitions`

Secret definitions required by the Zoom video-meetings bond.

```typescript
const videoMeetingsZoomSecretDefinitions: SecretDefinition[]
```

## Core Interface
Implements `@molecule/api-video-meetings` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-secrets` ^1.0.0
- `@molecule/api-video-meetings` 1.0.0

### Environment Variables

- `ZOOM_ACCOUNT_ID` *(required)* — Zoom account ID
  - Setup: Create a Server-to-Server OAuth app in the Zoom App Marketplace; copy the Account ID.
  - Get it here: [https://marketplace.zoom.us/](https://marketplace.zoom.us/)
- `ZOOM_CLIENT_ID` *(required)* — Zoom client ID
  - Setup: From your Server-to-Server OAuth app credentials.
  - Get it here: [https://marketplace.zoom.us/](https://marketplace.zoom.us/)
- `ZOOM_CLIENT_SECRET` *(required)* — Zoom client secret
  - Setup: From your Server-to-Server OAuth app credentials.
  - Get it here: [https://marketplace.zoom.us/](https://marketplace.zoom.us/)

### Runtime Dependencies

- `@molecule/api-secrets`
- `@molecule/api-video-meetings`

`createProvider()` validates credentials EAGERLY: without an `accessToken`
resolver, any missing ZOOM_ACCOUNT_ID / ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET
throws at bond time — an app wiring `setProvider(createProvider())` at
startup will not boot until the secrets are set (unlike the sms bonds,
which defer validation to first send). Requires a Zoom "Server-to-Server
OAuth" app type for the env-credentials mode.
