# @molecule/api-realtime-rooms

Realtime-rooms utility for molecule.dev.

Authenticated, capacity-bounded, role-aware named pub/sub rooms built
on top of `@molecule/api-realtime`'s transport bond and persisted via
`@molecule/api-database`'s abstract DataStore.

Solves the IDOR pattern flagged in flagship realtime apps
(quiz-platform live sessions, virtual-classroom rooms) where any
authenticated user could subscribe to / broadcast on any channel —
{@link assertCanAct} is the central guard.

## Quick Start

```typescript
import {
  createRoom,
  joinRoom,
  broadcast,
  subscribe,
  assertCanAct,
} from '@molecule/api-realtime-rooms'

// Host creates a private room with a join code.
const room = await createRoom({
  kind: 'quiz-session',
  ownerId: hostUserId,
  capacity: 30,
  joinCode: 'ABC123',
})

// Guest joins.
await joinRoom(room.id, guestUserId, 'ABC123')

// Broadcast a question — handler must authorise first.
await assertCanAct(room.id, hostUserId, 'host')
await broadcast(room.id, { kind: 'question-asked', payload: { qid: 1 } })
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-realtime-rooms @molecule/api-database @molecule/api-realtime
```

## API

### Interfaces

#### `BroadcastOptions`

Options for {@link broadcast}.

```typescript
interface BroadcastOptions {
  /** Event name / discriminator. */
  kind: string
  /** Event payload. */
  payload: unknown
  /** Optional override for the broadcast timestamp. Defaults to `new Date()`. */
  sentAt?: Date
}
```

#### `CreateRoomOptions`

Options for {@link createRoom}.

```typescript
interface CreateRoomOptions {
  /** App-level discriminator. */
  kind: string
  /** User id that will be recorded as the host. */
  ownerId: string
  /** Maximum concurrent members (host counts). Optional. */
  capacity?: number
  /** Shared secret required to join. When supplied, `isPublic` is forced `false`. */
  joinCode?: string
  /** Whether non-invited users may join freely. Defaults to `true`. */
  isPublic?: boolean
  /**
   * Optional pre-generated room id. When omitted, a new id is minted by
   * the underlying DataStore.
   */
  id?: string
}
```

#### `Room`

A persisted realtime room.

`kind` is an opaque app-level discriminator (e.g. `'quiz-session'`,
`'virtual-classroom'`) so a single rooms table can serve multiple
features without collision.

```typescript
interface Room {
  /** Unique room identifier. */
  id: string
  /** App-level discriminator, e.g. `'quiz-session'`. */
  kind: string
  /** User id of the room host (creator). */
  ownerId: string
  /** Maximum number of concurrent members. `undefined` means uncapped. */
  capacity?: number
  /** Optional shared secret required to join private rooms. */
  joinCode?: string
  /** When `false`, joiners must supply a matching {@link Room.joinCode}. */
  isPublic: boolean
  /** Creation timestamp. */
  createdAt: Date
}
```

#### `RoomEvent`

An event broadcast to all subscribers of a room.

`kind` is the event name (e.g. `'question-asked'`, `'answer-revealed'`)
and `payload` is the arbitrary serialisable body.

```typescript
interface RoomEvent {
  /** The room this event was broadcast on. */
  roomId: string
  /** Event name / discriminator. */
  kind: string
  /** Event payload. Must be JSON-serialisable. */
  payload: unknown
  /** Server-side broadcast timestamp. */
  sentAt: Date
}
```

#### `RoomMember`

A persisted member of a room.

```typescript
interface RoomMember {
  /** The room this membership belongs to. */
  roomId: string
  /** The user holding the membership. */
  userId: string
  /** The user's role within the room. */
  role: RoomRole
  /** When the user joined. */
  joinedAt: Date
}
```

### Types

#### `RoomEventHandler`

Subscription handler receiving every broadcast on a room.

```typescript
type RoomEventHandler = (event: RoomEvent) => void | Promise<void>
```

#### `RoomRole`

Role a member holds within a room.

- `host` — created the room, full control (close, kick, broadcast).
- `guest` — joined the room, may broadcast iff the host allows it.

```typescript
type RoomRole = 'host' | 'guest'
```

#### `Unsubscribe`

Function returned by {@link subscribe} that removes the subscription
when invoked. Implementations should be idempotent.

```typescript
type Unsubscribe = () => void
```

### Classes

#### `InvalidJoinCodeError`

Supplied join code did not match the room's configured code.

#### `RoomCapacityExceededError`

Room is full — capacity has been reached.

#### `RoomError`

Base class for all realtime-rooms errors.

#### `RoomNotFoundError`

The requested room does not exist.

#### `UnauthorizedRoomActionError`

The acting user is not authorised to perform the requested action.

Thrown by {@link assertCanAct} when the user is not a member of the
room or lacks the required role. This is the central guard that
fixes the IDOR pattern in flagship realtime apps.

### Functions

#### `assertCanAct(roomId, userId, requiredRole)`

Throws {@link UnauthorizedRoomActionError} unless `userId` is a member
of `roomId` (and optionally holds at least `requiredRole`).

Role hierarchy: `host` > `guest`. Requesting `requiredRole = 'guest'`
is satisfied by any membership; `requiredRole = 'host'` requires the
member's `role` to be `host`.

**Always call this before any broadcast / membership-mutation /
privileged read in your handler.** This is the IDOR fix.

```typescript
function assertCanAct(roomId: string, userId: string, requiredRole?: RoomRole): Promise<RoomMember>
```

- `roomId` — Room being acted on.
- `userId` — Acting user id.
- `requiredRole` — Minimum role required. Optional.

**Returns:** The member row (useful when the caller needs the role).

#### `broadcast(roomId, event)`

Broadcasts an event to all subscribers of a room via the bonded
`realtime` provider.

**Caller responsibility:** authorise first via {@link assertCanAct}.
This function is intentionally unauthenticated to keep it composable
— middleware/handlers decide whether the actor is allowed to publish.

```typescript
function broadcast(roomId: string, event: BroadcastOptions): Promise<RoomEvent>
```

- `roomId` — Room to broadcast on.
- `event` — Event kind + payload.

**Returns:** The {@link RoomEvent} that was broadcast (useful for echo /
 *          local persistence).

#### `channelFor(roomId)`

Realtime channel identifier for a given room. Apps subscribing to the
underlying transport directly should use this same convention so the
abstraction layers up cleanly.

```typescript
function channelFor(roomId: string): string
```

- `roomId` — Room identifier.

**Returns:** Stable channel name.

#### `closeRoom(roomId)`

Closes a room — deletes membership rows then the room itself.

Subscribers should observe a final event of their choosing (callers
commonly broadcast `'room-closed'` via {@link broadcast} immediately
before invoking this).

```typescript
function closeRoom(roomId: string): Promise<void>
```

- `roomId` — The room to close.

#### `createRoom(options)`

Creates a new room and registers the owner as the host member.

Capacity, join-code, and public/private invariants are enforced here
(a join-code forces `isPublic=false`).

```typescript
function createRoom(options: CreateRoomOptions): Promise<Room>
```

- `options` — Creation parameters.

**Returns:** The persisted room.

#### `joinRoom(roomId, userId, joinCode)`

Adds a user to a room as a `guest`.

Validates capacity and join-code. Re-joining is idempotent — a user
already in the room receives their existing membership without
incrementing the count.

```typescript
function joinRoom(roomId: string, userId: string, joinCode?: string): Promise<RoomMember>
```

- `roomId` — Room to join.
- `userId` — User joining.
- `joinCode` — Required when the room has a configured `joinCode`.

**Returns:** The user's membership row.

#### `leaveRoom(roomId, userId)`

Removes a user from a room. Idempotent — silently succeeds if the
user is not a member.

```typescript
function leaveRoom(roomId: string, userId: string): Promise<void>
```

- `roomId` — Room to leave.
- `userId` — User leaving.

#### `listMembers(roomId)`

Lists all current members of a room.

Note: callers that need to enforce visibility (only members can list
other members) should `await assertCanAct(roomId, viewerUserId)` first.

```typescript
function listMembers(roomId: string): Promise<RoomMember[]>
```

- `roomId` — Room to list.

**Returns:** Members ordered by `joined_at` ascending.

#### `subscribe(roomId, handler)`

Subscribes to all events for a room via the bonded `realtime`
provider. Returns an {@link Unsubscribe} function.

The bonded provider's `onMessage` is global per-process; each call
installs its own transport-level message listener (never removed —
the unsubscribe only deactivates the handler) and filters down to
the requested room. Callers who need fine-grained transport-level
unsubscription should use the bond directly.

```typescript
function subscribe(roomId: string, handler: RoomEventHandler): Unsubscribe
```

- `roomId` — Room to subscribe to.
- `handler` — Invoked with each {@link RoomEvent}.

**Returns:** Function that removes the subscription.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-realtime` ^1.0.0

### Runtime Dependencies

- `@molecule/api-database`
- `@molecule/api-realtime`

Tables: the .sql file under `src/__setup__` creates `realtime_rooms` +
`realtime_room_members`. An mlcl-scaffolded API replays .sql files under
`__setup__` automatically on migrate; anywhere else run it once — nothing
at runtime creates them. The shipped DDL is PostgreSQL-flavoured
(`gen_random_uuid()`, `TIMESTAMPTZ`); adapt the column types for
SQLite/MySQL — the service itself is dialect-agnostic (abstract DataStore).

Wiring prereqs: a database bond must be wired (any `@molecule/api-database-*`
provider) AND a realtime transport must be set via `@molecule/api-realtime`'s
`setProvider()` (e.g. the `@molecule/api-realtime-socketio` provider) before
`broadcast`/`subscribe` deliver anything. `subscribe()` registrations made
before the transport is set are buffered by api-realtime and flushed when
it is; `broadcast()` before then throws "Realtime provider not configured".

`subscribe()` registers a transport-level listener that is NOT removed by
the returned unsubscribe function (it only stops your handler from firing —
the underlying `onMessage` handler lives for the process lifetime). Create
long-lived subscriptions at startup; do not subscribe per request.
