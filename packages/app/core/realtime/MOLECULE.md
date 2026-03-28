# @molecule/app-realtime

Realtime client core interface for molecule.dev.

Provides a framework-agnostic contract for WebSocket / SSE client connections
with rooms, presence tracking, events, and automatic reconnection. Bond a
provider (e.g. `@molecule/app-realtime-socketio`) at startup, then use
{@link connect} anywhere.

## Type
`core`

## Installation
```bash
npm install @molecule/app-realtime
```

## Usage

```typescript
import { setProvider, connect } from '@molecule/app-realtime'
import { provider } from '@molecule/app-realtime-socketio'

setProvider(provider)

const connection = await connect('wss://api.example.com', {
  autoReconnect: true,
  auth: { token: 'my-jwt' },
})

await connection.joinRoom('chat-room-1')
connection.on('message', (data) => console.log('Received:', data))
connection.sendTo('chat-room-1', 'message', { text: 'Hello!' })
```

## API

### Interfaces

#### `ConnectionOptions`

Options for establishing a realtime connection.

```typescript
interface ConnectionOptions {
  /** Whether to automatically reconnect on disconnection. Defaults to `true`. */
  autoReconnect?: boolean
  /** Delay in milliseconds before attempting reconnection. Defaults to `1000`. */
  reconnectDelay?: number
  /** Maximum number of reconnection attempts. Defaults to `10`. */
  maxRetries?: number
  /** Authentication data sent during the handshake. */
  auth?: Record<string, unknown>
}
```

#### `PresenceInfo`

Presence information for a connected client in a room.

```typescript
interface PresenceInfo {
  /** The client's unique identifier. */
  clientId: string
  /** Arbitrary metadata attached to the client's presence (e.g. username, avatar). */
  metadata?: Record<string, unknown>
}
```

#### `RealtimeClientProvider`

Contract that bond packages must implement to provide realtime client
functionality.

```typescript
interface RealtimeClientProvider {
  /**
   * Establishes a realtime connection to the given server URL.
   *
   * @param url - The server URL to connect to.
   * @param options - Optional connection configuration.
   * @returns A promise resolving to a live realtime connection.
   */
  connect(url: string, options?: ConnectionOptions): Promise<RealtimeConnection>
}
```

#### `RealtimeConnection`

A live realtime connection exposing room, event, and presence methods.

```typescript
interface RealtimeConnection {
  // -- Rooms ---------------------------------------------------------------

  /**
   * Joins a room by id.
   *
   * @param roomId - The room to join.
   */
  joinRoom(roomId: string): Promise<void>

  /**
   * Leaves a room by id.
   *
   * @param roomId - The room to leave.
   */
  leaveRoom(roomId: string): Promise<void>

  // -- Messaging -----------------------------------------------------------

  /**
   * Sends an event to the server (broadcast to the default channel).
   *
   * @param event - The event name.
   * @param data - The event payload.
   */
  send(event: string, data: unknown): void

  /**
   * Sends an event to a specific room.
   *
   * @param roomId - The target room.
   * @param event - The event name.
   * @param data - The event payload.
   */
  sendTo(roomId: string, event: string, data: unknown): void

  // -- Event listening -----------------------------------------------------

  /**
   * Registers a handler for an incoming event.
   *
   * @param event - The event name to listen for.
   * @param handler - The handler callback.
   */
  on(event: string, handler: RealtimeEventHandler): void

  /**
   * Removes a handler for an event. If no handler is provided, all handlers
   * for that event are removed.
   *
   * @param event - The event name.
   * @param handler - The specific handler to remove (optional).
   */
  off(event: string, handler?: RealtimeEventHandler): void

  // -- Presence ------------------------------------------------------------

  /**
   * Returns the current presence information for all clients in a room.
   *
   * @param roomId - The room to query.
   * @returns Array of presence info for each connected client.
   */
  getPresence(roomId: string): PresenceInfo[]

  /**
   * Registers a handler that fires when presence changes in any joined room.
   *
   * @param handler - The presence change handler.
   */
  onPresenceChange(handler: PresenceChangeHandler): void

  // -- Connection lifecycle ------------------------------------------------

  /**
   * Disconnects from the server and cleans up resources.
   */
  disconnect(): void

  /**
   * Returns whether the connection is currently active.
   *
   * @returns `true` if connected to the server.
   */
  isConnected(): boolean

  /**
   * Returns the current connection state.
   *
   * @returns The current {@link ConnectionState}.
   */
  getState(): ConnectionState

  /**
   * Registers a handler that fires on successful reconnection.
   *
   * @param handler - The reconnection handler.
   */
  onReconnect(handler: () => void): void

  /**
   * Registers a handler that fires when the connection state changes.
   *
   * @param handler - The state change handler.
   */
  onStateChange(handler: ConnectionStateHandler): void
}
```

### Types

#### `ConnectionState`

Possible states of a realtime connection.

```typescript
type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'
```

#### `ConnectionStateHandler`

Handler invoked when the connection state changes.

```typescript
type ConnectionStateHandler = (state: ConnectionState) => void
```

#### `PresenceChangeHandler`

Handler invoked when presence information changes for a room.

```typescript
type PresenceChangeHandler = (presence: PresenceInfo[]) => void
```

#### `RealtimeEventHandler`

Handler invoked when a realtime event is received.

```typescript
type RealtimeEventHandler = (data: unknown) => void
```

### Functions

#### `connect(url, options)`

Establishes a realtime connection using the bonded provider.

```typescript
function connect(url: string, options?: ConnectionOptions): Promise<RealtimeConnection>
```

- `url` — The server URL to connect to.
- `options` — Optional connection configuration.

**Returns:** A promise resolving to a live realtime connection.

#### `getProvider()`

Retrieves the bonded realtime client provider, throwing if none is configured.

```typescript
function getProvider(): RealtimeClientProvider
```

**Returns:** The bonded realtime client provider.

#### `hasProvider()`

Checks whether a realtime client provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a realtime client provider is bonded.

#### `setProvider(provider)`

Registers a realtime client provider as the active singleton. Called by bond
packages (e.g. `@molecule/app-realtime-socketio`) during app startup.

```typescript
function setProvider(provider: RealtimeClientProvider): void
```

- `provider` — The realtime client provider implementation to bond.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
