/**
 * Realtime client provider interface and related types.
 *
 * Defines framework-agnostic contracts for WebSocket / SSE client connections
 * with support for rooms, presence, events, and automatic reconnection.
 *
 * @module
 */

// ---------------------------------------------------------------------------
// Connection options
// ---------------------------------------------------------------------------

/**
 * Options for establishing a realtime connection.
 */
export interface ConnectionOptions {
  /** Whether to automatically reconnect on disconnection. Defaults to `true`. */
  autoReconnect?: boolean
  /** Delay in milliseconds before attempting reconnection. Defaults to `1000`. */
  reconnectDelay?: number
  /** Maximum number of reconnection attempts. Defaults to `10`. */
  maxRetries?: number
  /** Authentication data sent during the handshake. */
  auth?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Presence
// ---------------------------------------------------------------------------

/**
 * Presence information for a connected client in a room.
 */
export interface PresenceInfo {
  /** The client's unique identifier. */
  clientId: string
  /** Arbitrary metadata attached to the client's presence (e.g. username, avatar). */
  metadata?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Event handler
// ---------------------------------------------------------------------------

/**
 * Handler invoked when a realtime event is received.
 *
 * @param data - The event payload.
 */
export type RealtimeEventHandler = (data: unknown) => void

/**
 * Handler invoked when presence information changes for a room.
 *
 * @param presence - The updated list of present clients.
 */
export type PresenceChangeHandler = (presence: PresenceInfo[]) => void

// ---------------------------------------------------------------------------
// Connection state
// ---------------------------------------------------------------------------

/**
 * Possible states of a realtime connection.
 */
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'

/**
 * Handler invoked when the connection state changes.
 *
 * @param state - The new connection state.
 */
export type ConnectionStateHandler = (state: ConnectionState) => void

// ---------------------------------------------------------------------------
// Realtime connection
// ---------------------------------------------------------------------------

/**
 * A live realtime connection exposing room, event, and presence methods.
 */
export interface RealtimeConnection {
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

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Contract that bond packages must implement to provide realtime client
 * functionality.
 */
export interface RealtimeClientProvider {
  /**
   * Establishes a realtime connection to the given server URL.
   *
   * @param url - The server URL to connect to.
   * @param options - Optional connection configuration.
   * @returns A promise resolving to a live realtime connection.
   */
  connect(url: string, options?: ConnectionOptions): Promise<RealtimeConnection>
}
