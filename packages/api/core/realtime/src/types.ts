/**
 * Realtime core types for molecule.dev.
 *
 * Defines the standard interfaces for WebSocket/SSE real-time communication providers.
 *
 * @module
 */

/**
 * A real-time communication room.
 */
export interface Room {
  /** Unique room identifier. */
  id: string

  /** Human-readable room name. */
  name: string

  /** Client IDs currently in the room. */
  clients: string[]

  /** Arbitrary metadata attached to the room. */
  metadata?: Record<string, unknown>
}

/**
 * Options for creating a room.
 */
export interface RoomOptions {
  /** Maximum number of clients allowed in the room. */
  maxClients?: number

  /** Arbitrary metadata to attach to the room. */
  metadata?: Record<string, unknown>

  /** Whether the room should persist after all clients leave. */
  persistent?: boolean
}

/**
 * Presence information for a connected client.
 */
export interface PresenceInfo {
  /** The client's unique identifier. */
  clientId: string

  /** When the client joined the room. */
  joinedAt: Date

  /** Arbitrary metadata attached to the client's presence. */
  metadata?: Record<string, unknown>
}

/**
 * Handler invoked when a message is received in a room.
 *
 * @param roomId - The room the message was sent in.
 * @param clientId - The client who sent the message.
 * @param event - The event name.
 * @param data - The message payload.
 */
export type MessageHandler = (
  roomId: string,
  clientId: string,
  event: string,
  data: unknown,
) => void

/**
 * Handler invoked when a client connects.
 *
 * @param clientId - The connected client's identifier.
 * @param metadata - Optional metadata about the connection.
 */
export type ConnectionHandler = (clientId: string, metadata?: Record<string, unknown>) => void

/**
 * Handler invoked when a client disconnects.
 *
 * @param clientId - The disconnected client's identifier.
 * @param reason - The reason for disconnection.
 */
export type DisconnectionHandler = (clientId: string, reason: string) => void

/**
 * Realtime provider interface.
 *
 * All realtime providers must implement this interface to provide
 * room-based, bidirectional real-time communication.
 */
export interface RealtimeProvider {
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
