# @molecule/app-realtime-socketio

Socket.io realtime client provider for molecule.dev.

A real socket.io-client transport implementing `RealtimeClientProvider`
from `@molecule/app-realtime`: rooms, presence, event buffering, and
reconnect-rejoin over a live Socket.io connection. The matching server
bond (`@molecule/api-realtime-socketio`) attaches a Socket.io Server to
the API's HTTP server at `/socket.io`, so client and server share one
port.

URL convention: `connect('')` or `connect('/')` connects same-origin
(`io()` with no URL — in dev, Vite proxies `/socket.io` to the API); an
absolute URL connects directly to that server. `ConnectionOptions.auth`
is passed through as the socket.io handshake `auth` payload, which the
server evaluates in its room join guards.

Reserved protocol events (client → server `molecule:join` /
`molecule:leave` / `molecule:room-send`, server → client
`molecule:joined` / `molecule:left` / `molecule:join-denied` /
`molecule:presence`) are handled internally and never dispatched to
app-level `on()` handlers. Rooms are keyed by name (arbitrary string,
e.g. `'channel:<uuid>'`).

## Quick Start

```typescript
import { setProvider, getProvider } from '@molecule/app-realtime'
import { provider } from '@molecule/app-realtime-socketio'

setProvider(provider)

// connect() resolves immediately (state 'connecting') — never blocks the UI.
const connection = await getProvider().connect('/', {
  auth: { token: authToken },
})

// Resolves when the server confirms; rejects with the reason if denied.
await connection.joinRoom('channel:general')

connection.on('message:created', (data) => {
  console.log('new message', data)
})
connection.sendTo('channel:general', 'message:created', { body: 'hi' })

// Or with custom configuration:
import { createSocketioProvider } from '@molecule/app-realtime-socketio'

setProvider(createSocketioProvider({
  transports: ['websocket'],
  bufferEvents: true,
  maxBufferSize: 200,
}))
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-realtime-socketio
```

## API

### Interfaces

#### `BufferedEvent`

An event that was sent while disconnected and is queued for delivery
upon (re)connection (when `bufferEvents` is enabled). The provider
flushes the queue over the socket, in order, on every `connect`.

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
   * Socket.io transport preferences, passed through as the socket.io-client
   * `transports` option. Defaults to `['websocket', 'polling']`.
   */
  transports?: Array<'websocket' | 'polling'>

  /**
   * Path for the socket.io endpoint, passed through as the socket.io-client
   * `path` option. Defaults to `'/socket.io'` — the path
   * `@molecule/api-realtime-socketio` attaches to on the API's HTTP server.
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

Extended connection instance exposing internal methods.

The provider itself owns the real socket.io-client Socket — transport,
protocol events, reconnect-rejoin, and buffering are all handled
internally. These `_`-prefixed methods exist for introspection (tests,
devtools) and for simulating transitions without a live server; they are
NOT required to wire the connection (that was the pre-transport design).

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
   * Returns the tracked (desired) rooms — every room requested via
   * `joinRoom()` (or confirmed by the server) and not yet left. This is the
   * set re-joined on reconnect; server confirmation status is tracked
   * separately via the pending join promises.
   *
   * @returns A copy of the tracked rooms set.
   */
  _getJoinedRooms(): Set<string>

  /**
   * Returns the buffered events queue (events sent while disconnected).
   *
   * @returns A copy of the buffered events array.
   */
  _getBufferedEvents(): BufferedEvent[]

  /**
   * Routes an event through the same pipeline as a real incoming socket
   * event: reserved `molecule:*` protocol events are consumed internally
   * (presence/join/leave state updates) and never reach app-level handlers;
   * everything else is dispatched to handlers registered via `on()`.
   * Useful for simulating server events in tests.
   *
   * @param event - The event name.
   * @param data - The event payload.
   */
  _triggerEvent(event: string, data: unknown): void

  /**
   * Updates the presence list for a room and notifies presence change
   * handlers — the same handler the reserved `molecule:presence` event runs.
   *
   * @param roomId - The room whose presence changed.
   * @param presence - The updated presence list.
   */
  _setPresence(roomId: string, presence: PresenceInfo[]): void

  /**
   * Overrides the local connection-state machine and notifies state change
   * handlers. Does NOT touch the underlying socket — the real state is
   * normally driven by the socket's own lifecycle events. Useful for
   * simulating transitions in tests.
   *
   * @param state - The new connection state.
   */
  _setState(state: ConnectionState): void

  /**
   * Simulates a reconnect notification: sets the state to `'connected'` and
   * fires all reconnect handlers. The REAL reconnect path (the socket's
   * `connect` event after a drop) additionally re-joins all tracked rooms
   * and flushes the send buffer.
   */
  _triggerReconnect(): void

  /**
   * Drains the buffered events queue WITHOUT emitting them — the provider
   * itself flushes the buffer over the socket on every (re)connect, so this
   * exists only for callers that want to take over delivery or
   * inspect-and-clear in tests.
   *
   * @returns The array of drained buffered events.
   */
  _flushBuffer(): BufferedEvent[]

  /**
   * Marks a room as joined — the same handler the reserved
   * `molecule:joined` event runs: tracks the room and resolves any pending
   * `joinRoom()` promise for it.
   *
   * @param roomId - The room name.
   */
  _confirmJoin(roomId: string): void

  /**
   * Marks a room as left — the same handler the reserved `molecule:left`
   * event runs: untracks the room and clears its local presence.
   *
   * @param roomId - The room name.
   */
  _confirmLeave(roomId: string): void

  /**
   * Returns all registered event handler entries.
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

Creates a Socket.io-based realtime client provider backed by
socket.io-client.

`connect()` resolves immediately with the connection object in the
`'connecting'` state — the UI is never blocked on server availability; use
`onStateChange()` to observe the transition to `'connected'`.

```typescript
function createSocketioProvider(config?: SocketioConfig): RealtimeClientProvider
```

- `config` — Optional Socket.io-specific configuration.

**Returns:** A `RealtimeClientProvider` backed by a real Socket.io transport.

### Constants

#### `provider`

Default Socket.io realtime client provider instance.

```typescript
const provider: RealtimeClientProvider
```

## Core Interface
Implements `@molecule/app-realtime` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-realtime'
import { provider } from '@molecule/app-realtime-socketio'

export function setupRealtimeSocketio(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-realtime` >=1.0.0

- `joinRoom()` promises are deferred while disconnected: the join is
  emitted on (re)connect and the promise stays pending until the server
  confirms with `molecule:joined` (or rejects it via
  `molecule:join-denied`). Don't `await` a join as a startup gate if the
  server may be unreachable.
- `sendTo(room, ...)` only reaches other clients if THIS client has
  protocol-joined the room (`joinRoom()` confirmed) — the server drops
  room sends from non-members.
- Vite dev servers need a `/socket.io` websocket proxy to the API —
  `@molecule/app-vite-config-default` provides it; without it, same-origin
  (`'/'`) connections fail in dev.
- Events sent while disconnected are buffered (default 100 max) and
  flushed in order on (re)connect; beyond the cap (or with
  `bufferEvents: false`) they are silently dropped.
- `disconnect()` is terminal for the connection object: it tears down the
  socket and rejects pending joins. Create a new connection via the
  provider to reconnect.
- `onPresenceChange(handler)` registers ONE handler that fires for EVERY
  joined room's presence update, so `handler`'s second argument (`roomId`)
  is which room the update is FOR — a consumer joined to more than one
  room must branch on it (e.g. `if (roomId === activeRoomId) render(...)`)
  instead of assuming the update is always for "the" room.
