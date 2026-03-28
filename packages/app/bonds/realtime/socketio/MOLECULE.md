# @molecule/app-realtime-socketio

Socket.io realtime client provider for molecule.dev.

Provides a headless Socket.io-style state manager for realtime connections,
with rooms, presence, event buffering, and reconnection support. Bond this
provider at startup, then use the core `@molecule/app-realtime` API anywhere.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-realtime-socketio
```

## Usage

```typescript
import { setProvider } from '@molecule/app-realtime'
import { provider } from '@molecule/app-realtime-socketio'

setProvider(provider)

// Or with custom configuration:
import { createSocketioProvider } from '@molecule/app-realtime-socketio'

setProvider(createSocketioProvider({
  transports: ['websocket'],
  bufferEvents: true,
  maxBufferSize: 200,
}))
```

## API

### Interfaces

#### `BufferedEvent`

An event that was sent while disconnected and is queued for delivery
upon reconnection (when `bufferEvents` is enabled).

```typescript
interface BufferedEvent {
  /** The target room, or `undefined` for broadcast events. */
  roomId?: string
  /** The event name. */
  event: string
  /** The event payload. */
  data: unknown
}
```

#### `SocketioConfig`

Socket.io-specific configuration for the realtime provider.

```typescript
interface SocketioConfig {
  /**
   * Socket.io transport preferences. Defaults to `['websocket', 'polling']`.
   */
  transports?: Array<'websocket' | 'polling'>

  /**
   * Path for the socket.io endpoint. Defaults to `'/socket.io'`.
   */
  path?: string

  /**
   * Whether to buffer events while disconnected and send them on reconnection.
   * Defaults to `true`.
   */
  bufferEvents?: boolean

  /**
   * Maximum number of events to buffer while disconnected.
   * Defaults to `100`.
   */
  maxBufferSize?: number
}
```

#### `SocketioConnection`

Extended connection instance exposing internal methods for framework bindings.

Framework bindings (React, Vue, etc.) use these `_`-prefixed methods to wire
actual Socket.io client events into the provider's state manager.

```typescript
interface SocketioConnection extends RealtimeConnection {
  /**
   * Returns the server URL used to establish this connection.
   *
   * @returns The connection URL string.
   */
  _getUrl(): string

  /**
   * Returns the connection options used to establish this connection.
   *
   * @returns The connection options.
   */
  _getOptions(): ConnectionOptions

  /**
   * Returns the Socket.io-specific configuration.
   *
   * @returns The provider configuration.
   */
  _getConfig(): SocketioConfig

  /**
   * Returns the set of room IDs currently joined.
   *
   * @returns A copy of the joined rooms set.
   */
  _getJoinedRooms(): Set<string>

  /**
   * Returns the buffered events queue (events sent while disconnected).
   *
   * @returns A copy of the buffered events array.
   */
  _getBufferedEvents(): BufferedEvent[]

  /**
   * Dispatches an incoming event to all registered handlers.
   * Called by framework bindings when actual socket data arrives.
   *
   * @param event - The event name.
   * @param data - The event payload.
   */
  _triggerEvent(event: string, data: unknown): void

  /**
   * Updates the presence list for a room and notifies presence change handlers.
   * Called by framework bindings when presence data is received.
   *
   * @param roomId - The room whose presence changed.
   * @param presence - The updated presence list.
   */
  _setPresence(roomId: string, presence: PresenceInfo[]): void

  /**
   * Updates the connection state and notifies state change handlers.
   * Called by framework bindings when the underlying socket state changes.
   *
   * @param state - The new connection state.
   */
  _setState(state: ConnectionState): void

  /**
   * Fires all registered reconnect handlers.
   * Called by framework bindings after a successful reconnection.
   */
  _triggerReconnect(): void

  /**
   * Flushes all buffered events and returns them so the framework binding
   * can emit them over the real socket. Clears the internal buffer.
   *
   * @returns The array of buffered events to send.
   */
  _flushBuffer(): BufferedEvent[]

  /**
   * Marks a room as joined in internal state.
   * Called by framework bindings after the server confirms the join.
   *
   * @param roomId - The room ID.
   */
  _confirmJoin(roomId: string): void

  /**
   * Marks a room as left in internal state.
   * Called by framework bindings after the server confirms the leave.
   *
   * @param roomId - The room ID.
   */
  _confirmLeave(roomId: string): void

  /**
   * Returns all registered event handler entries.
   * Used by framework bindings to wire listeners to the real socket.
   *
   * @returns A map of event names to handler sets.
   */
  _getEventHandlers(): Map<string, Set<RealtimeEventHandler>>

  /**
   * Returns all registered presence change handlers.
   *
   * @returns A copy of the presence change handlers array.
   */
  _getPresenceChangeHandlers(): PresenceChangeHandler[]

  /**
   * Returns all registered reconnect handlers.
   *
   * @returns A copy of the reconnect handlers array.
   */
  _getReconnectHandlers(): Array<() => void>

  /**
   * Returns all registered connection state change handlers.
   *
   * @returns A copy of the state change handlers array.
   */
  _getStateChangeHandlers(): ConnectionStateHandler[]
}
```

### Functions

#### `createSocketioProvider(config)`

Creates a Socket.io-based realtime client provider.

```typescript
function createSocketioProvider(config?: SocketioConfig): RealtimeClientProvider
```

- `config` — Optional Socket.io-specific configuration.

**Returns:** A `RealtimeClientProvider` backed by Socket.io-style state management.

### Constants

#### `provider`

Default Socket.io realtime client provider instance.

```typescript
const provider: RealtimeClientProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-realtime` >=1.0.0
