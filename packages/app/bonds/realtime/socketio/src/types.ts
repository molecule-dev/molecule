/**
 * Socket.io realtime provider configuration and extended types.
 *
 * The provider owns a real socket.io-client Socket; the `_`-prefixed
 * internals on {@link SocketioConnection} are introspection and simulation
 * hooks (used by tests and framework bindings), not the wiring surface.
 *
 * @module
 */

import type {
  ConnectionOptions,
  ConnectionState,
  ConnectionStateHandler,
  PresenceChangeHandler,
  PresenceInfo,
  RealtimeConnection,
  RealtimeEventHandler,
} from '@molecule/app-realtime'

// ---------------------------------------------------------------------------
// Provider config
// ---------------------------------------------------------------------------

/**
 * Socket.io-specific configuration for the realtime provider.
 */
export interface SocketioConfig {
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

// ---------------------------------------------------------------------------
// Buffered event
// ---------------------------------------------------------------------------

/**
 * An event that was sent while disconnected and is queued for delivery
 * upon (re)connection (when `bufferEvents` is enabled). The provider
 * flushes the queue over the socket, in order, on every `connect`.
 */
export interface BufferedEvent {
  /** The target room, or `undefined` for broadcast events. */
  roomId?: string
  /** The event name. */
  event: string
  /** The event payload. */
  data: unknown
}

// ---------------------------------------------------------------------------
// Extended connection (introspection / simulation internals)
// ---------------------------------------------------------------------------

/**
 * Extended connection instance exposing internal methods.
 *
 * The provider itself owns the real socket.io-client Socket — transport,
 * protocol events, reconnect-rejoin, and buffering are all handled
 * internally. These `_`-prefixed methods exist for introspection (tests,
 * devtools) and for simulating transitions without a live server; they are
 * NOT required to wire the connection (that was the pre-transport design).
 */
export interface SocketioConnection extends RealtimeConnection {
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
