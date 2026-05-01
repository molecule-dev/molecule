# @molecule/api-video-rooms

Video rooms core interface for molecule.dev.

Defines the standard interface for real-time video room providers
(Daily.co, LiveKit, Twilio Video, Agora, etc.). Used by apps such as
virtual classrooms, telemedicine, video conferencing, and screen
sharing.

## Quick Start

```typescript
import {
  setProvider,
  createRoom,
  createMeetingToken,
  listRecordings,
} from '@molecule/api-video-rooms'

// Bond a provider at startup (e.g. Daily.co)
setProvider(createProvider({ apiKey: process.env.DAILY_CO_API_KEY }))

// Create a room
const room = await createRoom({
  name: 'class-101',
  privacy: 'private',
  maxParticipants: 30,
  recording: true,
})

// Issue a join token for a student
const token = await createMeetingToken(room.name, {
  userName: 'Ada',
  expiresAt: new Date(Date.now() + 60 * 60_000),
})

// After the meeting, list recordings
const recordings = await listRecordings(room.name)
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-video-rooms
```

## API

### Interfaces

#### `CreateMeetingTokenOptions`

Options for issuing a meeting token (signed join credential).

```typescript
interface CreateMeetingTokenOptions {
  /** Whether the token grants owner / moderator privileges. */
  isOwner?: boolean

  /** Display name to use for the participant when joining the room. */
  userName?: string

  /** Token expiry. After this point the token cannot be used to join. */
  expiresAt?: Date
}
```

#### `CreateRoomOptions`

Options for creating a new video room.

```typescript
interface CreateRoomOptions {
  /** Room name. If omitted, the provider may auto-generate a unique name. */
  name?: string

  /** When the room should expire and stop accepting joins. */
  expiresAt?: Date

  /** Maximum simultaneous participants (provider-dependent cap may apply). */
  maxParticipants?: number

  /** Whether cloud recording should be enabled for this room. */
  recording?: boolean

  /** Visibility/privacy of the room. Defaults to `public` when omitted. */
  privacy?: RoomPrivacy
}
```

#### `Recording`

A normalised description of a cloud recording produced by a room.

```typescript
interface Recording {
  /** Provider-stable recording identifier. */
  id: string

  /** Name of the room the recording belongs to. */
  roomName: string

  /** When the recording started. */
  startedAt?: Date

  /** Recording duration in seconds, when known. */
  duration?: number

  /** Provider's reported processing/availability status. */
  status?: 'processing' | 'ready' | 'failed' | 'deleted'

  /** Time-limited download URL for the recording, when available. */
  downloadUrl?: string
}
```

#### `Room`

A normalised description of an existing room as returned by a provider.

```typescript
interface Room {
  /** Provider-stable room name / identifier. */
  name: string

  /** Joinable URL for the room. */
  url: string

  /** When the room expires, if a TTL is configured. */
  expiresAt?: Date

  /** Maximum simultaneous participants, if configured. */
  maxParticipants?: number

  /** Whether cloud recording is enabled on this room. */
  recording?: boolean

  /** Visibility/privacy of the room. */
  privacy?: RoomPrivacy
}
```

#### `RoomCreated`

Result of creating a new video room.

Extends {@link Room} with an optional pre-issued owner meeting token so
callers can hand a single payload to clients without a follow-up call.

```typescript
interface RoomCreated extends Room {
  /** Optional meeting token for the room creator (owner privileges). */
  token?: string
}
```

#### `VideoRoomsProvider`

Video rooms provider interface.

All video-rooms providers must implement this interface to provide a
normalised surface for room lifecycle, signed join tokens and cloud
recordings.

```typescript
interface VideoRoomsProvider {
  /**
   * Creates a new video room.
   *
   * @param options - Room creation options.
   * @returns The created room, including its joinable URL.
   */
  createRoom(options: CreateRoomOptions): Promise<RoomCreated>

  /**
   * Deletes an existing room by name. Idempotent: deleting a non-existent
   * room must not throw.
   *
   * @param name - The room name / identifier.
   */
  deleteRoom(name: string): Promise<void>

  /**
   * Retrieves an existing room by name.
   *
   * @param name - The room name / identifier.
   * @returns The room if it exists, otherwise `null`.
   */
  getRoom(name: string): Promise<Room | null>

  /**
   * Issues a signed meeting token (join credential) for a room.
   *
   * @param roomName - The room the token is scoped to.
   * @param options - Token options (owner flag, display name, expiry).
   * @returns The signed token string.
   */
  createMeetingToken(roomName: string, options?: CreateMeetingTokenOptions): Promise<string>

  /**
   * Lists cloud recordings produced by a room.
   *
   * @param roomName - The room to list recordings for.
   * @returns The list of recordings, possibly empty.
   */
  listRecordings(roomName: string): Promise<Recording[]>
}
```

### Types

#### `RoomPrivacy`

Privacy level for a video room.

- `public` — anyone with the room URL can join.
- `private` — joiners must present a meeting token issued by
  {@link VideoRoomsProvider.createMeetingToken}.

```typescript
type RoomPrivacy = 'public' | 'private'
```

### Functions

#### `createMeetingToken(roomName, options)`

Issues a signed meeting token (join credential) for a room using the
bonded provider.

```typescript
function createMeetingToken(roomName: string, options?: CreateMeetingTokenOptions): Promise<string>
```

- `roomName` — The room the token is scoped to.
- `options` — Token options (owner flag, display name, expiry).

**Returns:** The signed token string.

#### `createRoom(options)`

Creates a new video room using the bonded provider.

```typescript
function createRoom(options?: CreateRoomOptions): Promise<RoomCreated>
```

- `options` — Room creation options.

**Returns:** The created room, including its joinable URL.

#### `deleteRoom(name)`

Deletes an existing room by name using the bonded provider.

```typescript
function deleteRoom(name: string): Promise<void>
```

- `name` — The room name / identifier.

#### `getProvider()`

Retrieves the bonded video rooms provider, throwing if none is configured.

```typescript
function getProvider(): VideoRoomsProvider
```

**Returns:** The bonded video rooms provider.

#### `getRoom(name)`

Retrieves an existing room by name using the bonded provider.

```typescript
function getRoom(name: string): Promise<Room | null>
```

- `name` — The room name / identifier.

**Returns:** The room if it exists, otherwise `null`.

#### `hasProvider()`

Checks whether a video rooms provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a video rooms provider is bonded.

#### `listRecordings(roomName)`

Lists cloud recordings produced by a room using the bonded provider.

```typescript
function listRecordings(roomName: string): Promise<Recording[]>
```

- `roomName` — The room to list recordings for.

**Returns:** The list of recordings, possibly empty.

#### `setProvider(provider)`

Registers a video rooms provider as the active singleton. Called by
bond packages during application startup.

```typescript
function setProvider(provider: VideoRoomsProvider): void
```

- `provider` — The video rooms provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| Video Rooms | `@molecule/api-video-rooms-daily-co` |
| Video Rooms | `@molecule/api-video-rooms-livekit` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
