# @molecule/api-video-rooms-daily-co

Daily.co video rooms provider for molecule.dev.

Implements the `@molecule/api-video-rooms` interface using the Daily.co
REST API.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-video-rooms'
import { createProvider } from '@molecule/api-video-rooms-daily-co'

// Bond at startup (reads DAILY_CO_API_KEY by default)
setProvider(createProvider())

// Or with explicit config
setProvider(createProvider({ apiKey: 'd0c...' }))
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-video-rooms-daily-co @molecule/api-secrets @molecule/api-video-rooms
```

## API

### Interfaces

#### `DailyCoVideoRoomsConfig`

Configuration for the Daily.co video rooms provider.

```typescript
interface DailyCoVideoRoomsConfig {
  /** Daily.co API key. Defaults to `process.env.DAILY_CO_API_KEY`. */
  apiKey?: string

  /**
   * Override the Daily.co REST base URL. Useful for tests or self-hosted
   * proxies. Defaults to `https://api.daily.co/v1`.
   */
  baseUrl?: string

  /**
   * Optional `fetch` implementation. Defaults to the global `fetch` from
   * Node 20+. Tests may inject a mock here.
   */
  fetch?: typeof fetch
}
```

### Functions

#### `createProvider(config)`

Creates a Daily.co-backed {@link VideoRoomsProvider}.

```typescript
function createProvider(config?: DailyCoVideoRoomsConfig): VideoRoomsProvider
```

- `config` — Daily.co provider configuration. Falls back to the `DAILY_CO_API_KEY` environment variable when no `apiKey` is given.

**Returns:** A fully initialised `VideoRoomsProvider` backed by Daily.co.

### Constants

#### `videoRoomsDailyCoSecretDefinitions`

Secret definitions required by the Daily.co video-rooms bond.

```typescript
const videoRoomsDailyCoSecretDefinitions: SecretDefinition[]
```

## Core Interface
Implements `@molecule/api-video-rooms` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-secrets` ^1.0.0
- `@molecule/api-video-rooms` 1.0.0

### Environment Variables

- `DAILY_CO_API_KEY` *(required)* — Daily.co API key
  - Setup: Copy the API key from the Daily dashboard → Developers.
  - Get it here: [https://dashboard.daily.co/developers](https://dashboard.daily.co/developers)

### Runtime Dependencies

- `@molecule/api-secrets`
- `@molecule/api-video-rooms`

`createProvider()` throws at bond time when no API key is available
(config.apiKey or DAILY_CO_API_KEY) — an app wiring
`setProvider(createProvider())` at startup will not boot until the key is
set. `recording: true` maps to Daily.co cloud recording
(`enable_recording: 'cloud'`), which must be enabled on your Daily.co plan.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one by
one. A box you can't check is an integration bug to fix — not a skip.
CAVEAT: the live A/V call and the in-room video UI run inside the provider's
client and CANNOT be driven in the sandbox — verify the room LIFECYCLE and the
per-participant join TOKENS you mint server-side, never the media itself:
- [ ] Creating a room returns a usable handle: `createRoom(...)` yields a
  `RoomCreated` with a stable `name` and a joinable `url`, and the app persists
  that `name` on its own record — not a throwaway URL it can never resolve again.
- [ ] Each participant gets its OWN token: the app calls
  `createMeetingToken(room.name, { userName, expiresAt, isOwner })` per user, so
  two joiners receive two DISTINCT, short-lived credentials — never one static
  shared secret reused for everyone.
- [ ] The token honors role + scope + expiry: an owner/moderator token
  (`isOwner: true`) differs from a plain-participant token, each is scoped to the
  single `room.name` it was minted for (it admits no other room), and it carries
  the requested `expiresAt` — inspect the minted token's claims; don't assume it,
  and don't hand an owner token to an ordinary participant.
- [ ] `getRoom(name)` reflects real state: a created room resolves with its
  configured `privacy`/`maxParticipants`/`recording`, and after `deleteRoom(name)`
  it returns `null` — ending a room actually removes it, so its old URL/tokens no
  longer admit a join. (Live participant count is NOT in the core `Room` type —
  don't assert on it.)
- [ ] Size/quota holds: if the app sets `maxParticipants`, the created room
  carries that cap (the provider enforces it at join) — it isn't silently dropped.
- [ ] SECURITY — the provider API key (e.g. `DAILY_CO_API_KEY`) stays server-side;
  the browser only ever receives a token/URL your endpoint returned, never the key
  or a direct provider call. Private rooms are un-guessable: only an authorized
  user's request mints a token, and no unauthenticated caller joins a `private`
  room by guessing its `name`/URL without one.
