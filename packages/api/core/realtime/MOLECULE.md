# @molecule/api-realtime

Realtime core interface for molecule.dev.

Defines the standard interface for real-time communication providers
(WebSocket, SSE, Socket.io, etc.).

## Quick Start

```typescript
import { setProvider, createRoom, broadcast, onMessage } from '@molecule/api-realtime'

// Bond a provider at startup
setProvider(socketioProvider)

// Create a room and broadcast messages
const room = await createRoom('chat')
await broadcast(room.id, 'message', { text: 'Hello!' })

// Listen for incoming messages
onMessage((roomId, clientId, event, data) => {
  console.log(`${clientId} sent ${event} in ${roomId}:`, data)
})
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-realtime
```

## API

### Interfaces

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

Registers a handler for client connections via the bonded realtime provider.

```typescript
function onConnection(handler: ConnectionHandler): void
```

- `handler` — The connection handler callback.

#### `onDisconnection(handler)`

Registers a handler for client disconnections via the bonded realtime provider.

```typescript
function onDisconnection(handler: DisconnectionHandler): void
```

- `handler` — The disconnection handler callback.

#### `onMessage(handler)`

Registers a handler for incoming messages via the bonded realtime provider.

```typescript
function onMessage(handler: MessageHandler): void
```

- `handler` — The message handler callback.

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
packages during application startup.

```typescript
function setProvider(provider: RealtimeProvider): void
```

- `provider` — The realtime provider implementation to bond.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
