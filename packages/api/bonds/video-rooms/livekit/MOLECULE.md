# @molecule/api-video-rooms-livekit

LiveKit video rooms provider for molecule.dev.

Implements the `@molecule/api-video-rooms` interface against the
LiveKit Server API (Twirp transport) and the `livekit-server-sdk`
`AccessToken` HS256 JWT signer. Self-hostable + LiveKit Cloud — the
recommended provider for users who need to keep media on their own
infrastructure.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-video-rooms'
import { createProvider } from '@molecule/api-video-rooms-livekit'

// Bond at startup (reads LIVEKIT_URL / LIVEKIT_API_KEY /
// LIVEKIT_API_SECRET by default)
setProvider(createProvider())

// Or with explicit config
setProvider(createProvider({
  host: 'https://livekit.example.com',
  apiKey: 'APIxxx',
  apiSecret: 'secretxxx',
}))
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-video-rooms-livekit @molecule/api-secrets @molecule/api-video-rooms livekit-server-sdk
```

## API

### Interfaces

#### `LiveKitEgressClient`

Minimal `EgressClient` surface used by the provider for listing
recordings.

```typescript
interface LiveKitEgressClient {
  /** Lists egress (recording) jobs, optionally filtered by room. */
  listEgress(options?: { roomName?: string }): Promise<LiveKitEgressInfo[]>
}
```

#### `LiveKitEgressInfo`

Minimal LiveKit egress (recording job) shape. Status is the numeric
`EgressStatus` enum value from `@livekit/protocol`.

```typescript
interface LiveKitEgressInfo {
  /** Egress identifier. */
  egressId: string

  /** Name of the room the egress belongs to. */
  roomName: string

  /** Numeric `EgressStatus` enum (0=starting … 6=limit_reached). */
  status?: number

  /** Unix-seconds (or bigint) start time. */
  startedAt?: number | bigint

  /** Unix-seconds (or bigint) end time. */
  endedAt?: number | bigint

  /** Recorded file results, when present. */
  fileResults?: Array<{
    location?: string
    duration?: number | bigint
  }>
}
```

#### `LiveKitRoom`

Minimal LiveKit `Room` shape consumed by the provider. The real
protobuf class exposes additional fields we don't depend on.

```typescript
interface LiveKitRoom {
  /** Room name (stable identifier). */
  name: string

  /** Room sid (unique per-instance id). */
  sid?: string

  /** Maximum simultaneous participants. */
  maxParticipants?: number

  /** Empty-room TTL in seconds. */
  emptyTimeout?: number

  /** Departure-room TTL in seconds. */
  departureTimeout?: number

  /** Provider-side opaque metadata blob. */
  metadata?: string

  /** Unix-seconds creation timestamp (the protobuf field is `bigint`). */
  creationTime?: number | bigint

  /** Whether a recording is currently active on the room. */
  activeRecording?: boolean
}
```

#### `LiveKitRoomServiceClient`

Minimal `RoomServiceClient` surface used by the provider. Tests inject
a stub here to avoid HTTP traffic. The real
`livekit-server-sdk.RoomServiceClient` satisfies this shape.

```typescript
interface LiveKitRoomServiceClient {
  /** Creates a new LiveKit room. */
  createRoom(options: {
    name: string
    emptyTimeout?: number
    departureTimeout?: number
    maxParticipants?: number
    metadata?: string
  }): Promise<LiveKitRoom>

  /** Lists active rooms, optionally filtered by name. */
  listRooms(names?: string[]): Promise<LiveKitRoom[]>

  /** Deletes a room by name. */
  deleteRoom(room: string): Promise<void>
}
```

#### `LiveKitVideoRoomsConfig`

Configuration for the LiveKit video rooms provider.

```typescript
interface LiveKitVideoRoomsConfig {
  /**
   * LiveKit host (including protocol), e.g.
   * `https://my-project.livekit.cloud` or `https://livekit.example.com`.
   * Defaults to `process.env.LIVEKIT_URL` (which may use `wss://` — the
   * provider rewrites it to `https://` for HTTP/Twirp calls).
   */
  host?: string

  /**
   * LiveKit API key. Defaults to `process.env.LIVEKIT_API_KEY`.
   */
  apiKey?: string

  /**
   * LiveKit API secret. Defaults to `process.env.LIVEKIT_API_SECRET`.
   * Used to sign JWT meeting tokens via HS256.
   */
  apiSecret?: string

  /**
   * Optional default token TTL in seconds. Used when
   * `createMeetingToken()` is called without an `expiresAt`. Defaults to
   * `21600` (6 hours), matching the `livekit-server-sdk` default.
   */
  defaultTokenTtl?: number

  /**
   * Optional pre-built `RoomServiceClient` (or compatible stub). Tests
   * inject a stub here. When omitted, the provider lazily constructs a
   * real `RoomServiceClient` from the SDK on first use.
   */
  roomServiceClient?: LiveKitRoomServiceClient

  /**
   * Optional pre-built `EgressClient` (or compatible stub). Tests inject
   * a stub here. When omitted, the provider lazily constructs a real
   * `EgressClient` from the SDK on first use.
   */
  egressClient?: LiveKitEgressClient

  /**
   * Optional `AccessToken` constructor override. Tests inject a fake
   * builder to avoid the real `jose` HS256 signer. Defaults to the
   * `AccessToken` class exported by `livekit-server-sdk`.
   */
  accessTokenCtor?: AccessTokenCtor
}
```

### Types

#### `AccessTokenCtor`

Constructor for `livekit-server-sdk`'s `AccessToken` class. Exposed so
tests can inject a fake builder without spinning up the real `jose`
signer.

```typescript
type AccessTokenCtor = new (
  apiKey?: string,
  apiSecret?: string,
  options?: ConstructorParameters<typeof AccessTokenClass>[2],
) => AccessTokenClass
```

### Functions

#### `createProvider(config)`

Creates a LiveKit-backed {@link VideoRoomsProvider}.

Self-hostable: pass a `host` of e.g. `https://livekit.example.com` or
set `LIVEKIT_URL` to the same value (or a `wss://` URL — the provider
rewrites the protocol for the HTTP/Twirp endpoints).

The API secret is **never** included in any error thrown by this
provider — both the missing-secret error and SDK-error wrappers
scrub it out.

```typescript
function createProvider(config?: LiveKitVideoRoomsConfig): VideoRoomsProvider
```

- `config` — LiveKit provider configuration. Falls back to the

**Returns:** A fully initialised `VideoRoomsProvider` backed by LiveKit.

### Constants

#### `videoRoomsLivekitSecretDefinitions`

Secret definitions required by the LiveKit video-rooms bond.

```typescript
const videoRoomsLivekitSecretDefinitions: SecretDefinition[]
```

## Core Interface
Implements `@molecule/api-video-rooms` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-secrets` ^1.0.0
- `@molecule/api-video-rooms` 1.0.0

### Environment Variables

- `LIVEKIT_URL` *(required)* — LiveKit server URL
  - Setup: Your LiveKit Cloud project URL (or self-hosted wss:// URL).
  - Get it here: [https://cloud.livekit.io/](https://cloud.livekit.io/)
  - Example: `wss://your-app.livekit.cloud`
- `LIVEKIT_API_KEY` *(required)* — LiveKit API key
  - Setup: LiveKit Cloud → project → Settings → Keys.
  - Get it here: [https://cloud.livekit.io/](https://cloud.livekit.io/)
- `LIVEKIT_API_SECRET` *(required)* — LiveKit API secret
  - Setup: Shown when creating the key in LiveKit Cloud.
  - Get it here: [https://cloud.livekit.io/](https://cloud.livekit.io/)

### Runtime Dependencies

- `@molecule/api-secrets`
- `@molecule/api-video-rooms`
- `livekit-server-sdk`

- **`privacy` is decorative on LiveKit.** LiveKit has no public/private
  room modes — EVERY participant needs a token from
  `createMeetingToken()`, and the returned `Room.url` is the server's
  `wss://` endpoint (not a joinable link). The bond echoes `privacy` back
  on the room object but nothing enforces it; the core's "public rooms are
  joinable by URL" caveat does not apply to this bond.
- **`recording: true` does not start or configure recording.** LiveKit
  records via Egress, which this bond never starts — the flag is echoed
  back only, and `listRecordings()` stays empty unless an egress was
  started elsewhere.
- `expiresAt` on `createRoom` maps to LiveKit's `emptyTimeout` (how long
  an empty room survives), not an absolute expiry.
- All meeting tokens grant `canPublish` + `canSubscribe`; `isOwner` adds
  `roomAdmin` — there is no subscribe-only token option in this revision.
- `createProvider()` throws at bond time when LIVEKIT_URL /
  LIVEKIT_API_KEY / LIVEKIT_API_SECRET are unset.
