/**
 * Realtime core types for molecule.dev.
 *
 * Defines the standard interfaces for WebSocket/SSE real-time communication providers.
 *
 * @module
 */

import type { Server as HttpServer } from 'node:http'
import type { Server as HttpsServer } from 'node:https'

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
 * A client's request to join a room by name via the client-initiated
 * room-join protocol (the reserved `molecule:join` event).
 */
export interface JoinRequest {
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

/**
 * Authorization guard for client-initiated room joins.
 *
 * Semantics: no guards registered → every join is allowed; multiple guards →
 * ALL must return `true` (AND); a guard that throws → the join is denied
 * (bonds log the error — never silently).
 *
 * @param request - The join request (client, room name, handshake auth).
 * @returns `true` to allow the join, `false` to deny.
 */
export type JoinGuard = (request: JoinRequest) => boolean | Promise<boolean>

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
