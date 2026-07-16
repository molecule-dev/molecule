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

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Scheduling a meeting from the UI (topic, start time, duration) calls
  `createMeeting` and persists it: the returned `joinUrl` (plus
  `meetingCode`/`password` if shown) is saved with the meeting and the new
  meeting appears in the user's own list (`listMeetings`) at the right time.
- [ ] The join URL/token is per-meeting and scoped: each meeting has its own
  `joinUrl` (+ password if set), not one static guessable link that lets
  anyone in; opening it reaches THAT meeting only. The host-only `startUrl`
  is NEVER handed to a participant view.
- [ ] Editing the meeting (new time, topic, or settings) calls
  `updateMeeting` and the change shows in the list and detail; if the app
  models invitees/attendees, adding or removing one updates the meeting's
  own record while the `joinUrl` still resolves to the same meeting.
- [ ] Cancelling a meeting calls `deleteMeeting`, drops it from the user's
  list, and is idempotent (deleting an already-gone meeting shows a clean
  state, not a crash). If the app exposes a recording (`autoRecording:
  'cloud'`), the artifact is retrievable through the app's OWN
  storage/endpoint — never a raw provider URL.
- [ ] A returning host re-opening "their meeting" reuses the SAME persisted
  meeting (same `id`/`joinUrl`), not a fresh duplicate on every visit.
Caveat: real audio/video and the third-party meeting client can't be driven
in the sandbox — you cannot join the live call. Verify the meeting LIFECYCLE
and the token/URL generation you own (create → list → update → delete, and
the `joinUrl`/`startUrl` split) against the app's own persisted meeting
record, not the in-call experience. Never mock the flow or edit production
code to fake it.
- [ ] SECURITY — provider API keys/secrets (`ZOOM_ACCOUNT_ID`,
  `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, and any bonded provider's keys)
  stay server-side: they never appear in a client response or the app
  bundle, and the host-only `startUrl` never reaches an invitee. Only
  authorized users (host or invited participants) can fetch a meeting's join
  token/details — a different user id-guessing another meeting's id gets a
  403/404, not its `joinUrl`.
