# @molecule/api-realtime

Realtime core interface for molecule.dev.

Defines the standard interface for real-time communication providers
(WebSocket, SSE, Socket.io, etc.), including the client-initiated room-join
protocol with pluggable authorization.

## Client-initiated room-join protocol

Connected clients join rooms **by name** (any string, e.g.
`channel:<uuid>`) with the reserved `molecule:join` event
(payload `{ room }`). The server replies `molecule:joined` `{ room }` on
success or `molecule:join-denied` `{ room, reason? }` on rejection, sends
`molecule:leave` acks as `molecule:left` `{ room }`, and emits
`molecule:presence` `{ room, presence: [{ clientId }] }` to the room on
every join/leave/disconnect. Clients send app messages into a joined room
with `molecule:room-send` `{ room, event, data }`, which dispatches to
server `onMessage` handlers. Protocol room names live in the same
namespace `broadcast(roomId, ...)` uses, so server code pushes to a
protocol room by its name. The managed `createRoom()`/`joinRoom()` API
(server-driven, `room_N` ids) is unchanged and coexists.

Authorization is pluggable via {@link onJoinRequest} guards: no guards →
every join is allowed; multiple guards → ALL must return `true` (AND); a
guard that throws → the join is denied (the bond logs the error).

## Quick Start

```typescript
import { setProvider, createRoom, broadcast, onMessage, onJoinRequest } from '@molecule/api-realtime'

// Bond a provider at startup
setProvider(socketioProvider)

// Authorize client-initiated joins (REQUIRED for apps with private rooms)
onJoinRequest(async ({ clientId, room, auth }) => {
  const userId = await verifyToken(auth.token)
  return userId !== undefined && (await canAccessRoom(userId, room))
})

// Push to a client-joined room by NAME
await broadcast('channel:general', 'message', { text: 'Hello!' })

// Managed (server-driven) rooms still work unchanged
const room = await createRoom('chat')
await broadcast(room.id, 'message', { text: 'Hello!' })

// Listen for incoming messages (including molecule:room-send dispatches)
onMessage((roomId, clientId, event, data) => {
  console.log(`${clientId} sent ${event} in ${roomId}:`, data)
})
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-realtime @molecule/api-bond @molecule/api-i18n
```

## API

### Interfaces

#### `JoinRequest`

A client's request to join a room by name via the client-initiated
room-join protocol (the reserved `molecule:join` event).

```typescript
interface JoinRequest {
  /** The connected client's identifier (e.g. the Socket.io socket id). */
  clientId: string

  /** The room NAME the client wants to join (arbitrary string, e.g. `channel:<uuid>`). */
  room: string

  /**
   * The client's handshake auth payload. Socket.io: `socket.handshake.auth`;
   * ws/SSE: the connection URL's query params. `{}` when the transport
   * carries no auth.
   */
  auth: Record<string, unknown>

  /**
   * The HTTP headers of the transport request that established the
   * connection (Socket.io handshake / ws upgrade / SSE subscribe), when the
   * transport exposes them. Apps whose sessions live in an httpOnly cookie
   * (browser JS never sees the token, so it can't be sent in `auth`)
   * authenticate joins from `headers.cookie` — the browser attaches the
   * session cookie to the same-origin handshake request automatically.
   */
  headers?: Record<string, string | string[] | undefined>
}
```

#### `PresenceInfo`

Presence information for a connected client.

```typescript
interface PresenceInfo {
  /** The client's unique identifier. */
  clientId: string

  /** When the client joined the room. */
  joinedAt: Date

  /** Arbitrary metadata attached to the client's presence. */
  metadata?: Record<string, unknown>
}
```

#### `RealtimeProvider`

Realtime provider interface.

All realtime providers must implement this interface to provide
room-based, bidirectional real-time communication.

```typescript
interface RealtimeProvider {
  /**
   * Creates a new room.
   *
   * @param name - Human-readable room name.
   * @param options - Optional room configuration.
   * @returns The created room.
   */
  createRoom(name: string, options?: RoomOptions): Promise<Room>

  /**
   * Adds a client to a room.
   *
   * @param roomId - The room to join.
   * @param clientId - The client joining the room.
   */
  joinRoom(roomId: string, clientId: string): Promise<void>

  /**
   * Removes a client from a room.
   *
   * @param roomId - The room to leave.
   * @param clientId - The client leaving the room.
   */
  leaveRoom(roomId: string, clientId: string): Promise<void>

  /**
   * Sends an event to all clients in a room.
   *
   * @param roomId - The target room.
   * @param event - The event name.
   * @param data - The event payload.
   */
  broadcast(roomId: string, event: string, data: unknown): Promise<void>

  /**
   * Sends an event to a specific client.
   *
   * @param clientId - The target client.
   * @param event - The event name.
   * @param data - The event payload.
   */
  sendTo(clientId: string, event: string, data: unknown): Promise<void>

  /**
   * Registers a handler for incoming messages.
   *
   * @param handler - The message handler callback.
   */
  onMessage(handler: MessageHandler): void

  /**
   * Registers a handler for client connections.
   *
   * @param handler - The connection handler callback.
   */
  onConnection(handler: ConnectionHandler): void

  /**
   * Registers a handler for client disconnections.
   *
   * @param handler - The disconnection handler callback.
   */
  onDisconnection(handler: DisconnectionHandler): void

  /**
   * Optionally registers an authorization guard for the client-initiated
   * room-join protocol (`molecule:join`). Providers that implement the
   * protocol evaluate every registered guard for each join request: with no
   * guards every join is allowed; with multiple guards ALL must return `true`;
   * a guard that throws denies the join. Providers whose transport has no
   * client-initiated join path may leave this undefined.
   *
   * @param guard - The join guard to register.
   */
  onJoinRequest?(guard: JoinGuard): void

  /**
   * Returns presence information for all clients in a room.
   *
   * @param roomId - The room to query.
   * @returns Array of presence info for each connected client.
   */
  getPresence(roomId: string): Promise<PresenceInfo[]>

  /**
   * Returns all active rooms.
   *
   * @returns Array of active rooms.
   */
  getRooms(): Promise<Room[]>

  /**
   * Optionally attach the provider's transport to an already-created HTTP(S)
   * server (e.g. the API's server) so realtime shares the API's port — rather
   * than binding a separate standalone port that a containerized/proxied
   * deployment may not expose. Providers that bind their transport eagerly at
   * creation may leave this undefined. When present it is called once, with the
   * real HTTP(S) server, before the server starts listening.
   *
   * @param server - The HTTP(S) server to attach the realtime transport to.
   */
  attachHttpServer?(server: HttpServer | HttpsServer): void

  /**
   * Shuts down the realtime provider and cleans up resources.
   */
  close(): Promise<void>
}
```

#### `Room`

A real-time communication room.

```typescript
interface Room {
  /** Unique room identifier. */
  id: string

  /** Human-readable room name. */
  name: string

  /** Client IDs currently in the room. */
  clients: string[]

  /** Arbitrary metadata attached to the room. */
  metadata?: Record<string, unknown>
}
```

#### `RoomOptions`

Options for creating a room.

```typescript
interface RoomOptions {
  /** Maximum number of clients allowed in the room. */
  maxClients?: number

  /** Arbitrary metadata to attach to the room. */
  metadata?: Record<string, unknown>

  /** Whether the room should persist after all clients leave. */
  persistent?: boolean
}
```

### Types

#### `ConnectionHandler`

Handler invoked when a client connects.

```typescript
type ConnectionHandler = (clientId: string, metadata?: Record<string, unknown>) => void
```

#### `DisconnectionHandler`

Handler invoked when a client disconnects.

```typescript
type DisconnectionHandler = (clientId: string, reason: string) => void
```

#### `JoinGuard`

Authorization guard for client-initiated room joins.

Semantics: no guards registered → every join is allowed; multiple guards →
ALL must return `true` (AND); a guard that throws → the join is denied
(bonds log the error — never silently).

```typescript
type JoinGuard = (request: JoinRequest) => boolean | Promise<boolean>
```

#### `MessageHandler`

Handler invoked when a message is received in a room.

```typescript
type MessageHandler = (
  roomId: string,
  clientId: string,
  event: string,
  data: unknown,
) => void
```

### Functions

#### `broadcast(roomId, event, data)`

Sends an event to all clients in a room using the bonded realtime provider.

```typescript
function broadcast(roomId: string, event: string, data: unknown): Promise<void>
```

- `roomId` — The target room.
- `event` — The event name.
- `data` — The event payload.

**Returns:** Resolves when the broadcast completes.

#### `close()`

Shuts down the bonded realtime provider and cleans up resources.

```typescript
function close(): Promise<void>
```

**Returns:** Resolves when sockets and timers are torn down.

#### `createRoom(name, options)`

Creates a new room using the bonded realtime provider.

```typescript
function createRoom(name: string, options?: RoomOptions): Promise<Room>
```

- `name` — Human-readable room name.
- `options` — Optional room configuration.

**Returns:** The created room.

#### `getPresence(roomId)`

Returns presence information for all clients in a room.

```typescript
function getPresence(roomId: string): Promise<PresenceInfo[]>
```

- `roomId` — The room to query.

**Returns:** Array of presence info for each connected client.

#### `getProvider()`

Retrieves the bonded realtime provider, throwing if none is configured.

```typescript
function getProvider(): RealtimeProvider
```

**Returns:** The bonded realtime provider.

#### `getRooms()`

Returns all active rooms.

```typescript
function getRooms(): Promise<Room[]>
```

**Returns:** Array of active rooms.

#### `hasProvider()`

Checks whether a realtime provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a realtime provider is bonded.

#### `joinRoom(roomId, clientId)`

Adds a client to a room using the bonded realtime provider.

```typescript
function joinRoom(roomId: string, clientId: string): Promise<void>
```

- `roomId` — The room to join.
- `clientId` — The client joining the room.

**Returns:** Resolves when the join operation completes.

#### `leaveRoom(roomId, clientId)`

Removes a client from a room using the bonded realtime provider.

```typescript
function leaveRoom(roomId: string, clientId: string): Promise<void>
```

- `roomId` — The room to leave.
- `clientId` — The client leaving the room.

**Returns:** Resolves when the leave operation completes.

#### `onConnection(handler)`

Registers a handler for client connections. Buffered + flushed on setProvider
if no provider is bonded yet, so it is safe to call before the realtime bond
binds at server-creation (e.g. presence handlers in postBondsSetup).

```typescript
function onConnection(handler: ConnectionHandler): void
```

- `handler` — The connection handler callback.

#### `onDisconnection(handler)`

Registers a handler for client disconnections. Buffered + flushed on
setProvider if no provider is bonded yet, so it is safe to call before the
realtime bond binds at server-creation (e.g. in postBondsSetup).

```typescript
function onDisconnection(handler: DisconnectionHandler): void
```

- `handler` — The disconnection handler callback.

#### `onJoinRequest(guard)`

Registers an authorization guard for the client-initiated room-join
protocol (`molecule:join`). Buffered + flushed on setProvider if no
provider is bonded yet, so it is safe to call before the realtime bond
binds at server-creation (e.g. in postBondsSetup).

Guard semantics: no guards registered → every join is allowed; multiple
guards → ALL must return `true` (AND); a guard that throws → the join is
denied (the bond logs the error). The guard receives the client id, the
requested room NAME, and the client's handshake auth payload.

```typescript
function onJoinRequest(guard: JoinGuard): void
```

- `guard` — The join guard callback.

#### `onMessage(handler)`

Registers a handler for incoming messages. Buffered + flushed on setProvider
if no provider is bonded yet, so it is safe to call before the realtime bond
binds at server-creation (e.g. in postBondsSetup).

```typescript
function onMessage(handler: MessageHandler): void
```

- `handler` — The message handler callback.

#### `registerConnection(handler)`

Register a connection handler now if a provider is bonded, else buffer it for
flush on the next setProvider(). Order-independent (see the buffer comment).

```typescript
function registerConnection(handler: ConnectionHandler): void
```

- `handler` — The connection handler to register or buffer.

#### `registerDisconnection(handler)`

Register a disconnection handler now if bonded, else buffer it.

```typescript
function registerDisconnection(handler: DisconnectionHandler): void
```

- `handler` — The disconnection handler to register or buffer.

#### `registerJoinGuard(guard)`

Register a join guard now if bonded, else buffer it for flush on the next
setProvider(). Order-independent (see the buffer comment), so apps can
register room authorization in postBondsSetup before the realtime bond
binds at server-creation.

```typescript
function registerJoinGuard(guard: JoinGuard): void
```

- `guard` — The join guard to register or buffer.

#### `registerMessage(handler)`

Register a message handler now if bonded, else buffer it.

```typescript
function registerMessage(handler: MessageHandler): void
```

- `handler` — The message handler to register or buffer.

#### `sendTo(clientId, event, data)`

Sends an event to a specific client using the bonded realtime provider.

```typescript
function sendTo(clientId: string, event: string, data: unknown): Promise<void>
```

- `clientId` — The target client.
- `event` — The event name.
- `data` — The event payload.

**Returns:** Resolves when the message is delivered to the transport layer.

#### `setProvider(provider)`

Registers a realtime provider as the active singleton. Called by bond
packages during application startup. Flushes any connection/disconnection/
message handlers that were registered before the provider was bonded.

```typescript
function setProvider(provider: RealtimeProvider): void
```

- `provider` — The realtime provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| Realtime | `@molecule/api-realtime-socketio` |
| Realtime | `@molecule/api-realtime-sse` |
| Realtime | `@molecule/api-realtime-ws` |
| Realtime (Yjs CRDT) | `@molecule/api-realtime-yjs` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-i18n`

- **Pick the provider by your host's server model (read this FIRST).** SSE
  (`@molecule/api-realtime-sse`) is HTTP-native: it streams from an ordinary
  route/endpoint and needs NO long-lived socket server, so it is the ONLY
  realtime that fits a serverless / no-persistent-server host — e.g. **Next.js
  App Router** or edge. There, mount its endpoint in a route handler and
  publish from server code (Next's `instrumentation.ts` runs at server start).
  Reach for WS (`-ws`) or Socket.io (`-socketio`) ONLY where you own a
  persistent Node server (a standalone process, or a separate API on its own
  port). Do NOT bolt a WS/Socket.io server onto Next.js App Router with a
  custom `server.ts` — you give up Next's managed server and fight its
  lifecycle. The interface below is identical for every provider; only the
  bond and where you attach its transport change.
- **Without a registered join guard ANY connected client may join ANY room
  by name** — apps with private rooms MUST register `onJoinRequest` and
  validate the request's `auth` payload (e.g. verify a token grants access
  to `request.room`). `auth` is the client's handshake auth (Socket.io:
  `socket.handshake.auth`; ws/SSE: connection query params).
- `onJoinRequest` (like `onMessage`/`onConnection`) is buffered when called
  before a provider is bonded and flushed on `setProvider()` — safe to call
  in postBondsSetup.
- `molecule:room-send` only dispatches to server `onMessage` handlers —
  there is NO automatic relay to the room. Server code decides what (if
  anything) to `broadcast` back.
- Reserved `molecule:*` events are never dispatched to `onMessage`.
- `RealtimeProvider.onJoinRequest` is optional: providers whose transport
  has no client-initiated join path (e.g. the yjs bond with its injected
  transport) leave it undefined, and guards registered against them are
  logged as unenforceable rather than silently dropped.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] With the app open in TWO sessions (separate browser contexts/users), an
  action in one (send a message, update a shared record) appears in the
  other WITHOUT a manual reload.
- [ ] Updates reach only the sessions in the same room/scope — a session
  viewing a different room/record receives nothing.
- [ ] Private rooms enforce the join guard: an unauthorized session's join is
  denied and no data leaks to it. If ANY client can join any private room,
  `onJoinRequest` was never registered — an integration bug.
- [ ] Presence (if surfaced) updates when a participant joins and leaves.
- [ ] After a dropped connection (offline/online toggle or server restart),
  the client reconnects and live events flow again.
