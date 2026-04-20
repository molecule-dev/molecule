/**
 * Realtime convenience functions that delegate to the bonded provider.
 *
 * @module
 */

import { getProvider } from './provider.js'
import type {
  ConnectionHandler,
  DisconnectionHandler,
  MessageHandler,
  PresenceInfo,
  Room,
  RoomOptions,
} from './types.js'

/**
 * Creates a new room using the bonded realtime provider.
 *
 * @param name - Human-readable room name.
 * @param options - Optional room configuration.
 * @returns The created room.
 * @throws {Error} If no realtime provider has been bonded.
 */
export const createRoom = async (name: string, options?: RoomOptions): Promise<Room> => {
  return getProvider().createRoom(name, options)
}

/**
 * Adds a client to a room using the bonded realtime provider.
 *
 * @param roomId - The room to join.
 * @param clientId - The client joining the room.
 * @returns Resolves when the join operation completes.
 * @throws {Error} If no realtime provider has been bonded.
 */
export const joinRoom = async (roomId: string, clientId: string): Promise<void> => {
  return getProvider().joinRoom(roomId, clientId)
}

/**
 * Removes a client from a room using the bonded realtime provider.
 *
 * @param roomId - The room to leave.
 * @param clientId - The client leaving the room.
 * @returns Resolves when the leave operation completes.
 * @throws {Error} If no realtime provider has been bonded.
 */
export const leaveRoom = async (roomId: string, clientId: string): Promise<void> => {
  return getProvider().leaveRoom(roomId, clientId)
}

/**
 * Sends an event to all clients in a room using the bonded realtime provider.
 *
 * @param roomId - The target room.
 * @param event - The event name.
 * @param data - The event payload.
 * @returns Resolves when the broadcast completes.
 * @throws {Error} If no realtime provider has been bonded.
 */
export const broadcast = async (roomId: string, event: string, data: unknown): Promise<void> => {
  return getProvider().broadcast(roomId, event, data)
}

/**
 * Sends an event to a specific client using the bonded realtime provider.
 *
 * @param clientId - The target client.
 * @param event - The event name.
 * @param data - The event payload.
 * @returns Resolves when the message is delivered to the transport layer.
 * @throws {Error} If no realtime provider has been bonded.
 */
export const sendTo = async (clientId: string, event: string, data: unknown): Promise<void> => {
  return getProvider().sendTo(clientId, event, data)
}

/**
 * Registers a handler for incoming messages via the bonded realtime provider.
 *
 * @param handler - The message handler callback.
 * @throws {Error} If no realtime provider has been bonded.
 */
export const onMessage = (handler: MessageHandler): void => {
  getProvider().onMessage(handler)
}

/**
 * Registers a handler for client connections via the bonded realtime provider.
 *
 * @param handler - The connection handler callback.
 * @throws {Error} If no realtime provider has been bonded.
 */
export const onConnection = (handler: ConnectionHandler): void => {
  getProvider().onConnection(handler)
}

/**
 * Registers a handler for client disconnections via the bonded realtime provider.
 *
 * @param handler - The disconnection handler callback.
 * @throws {Error} If no realtime provider has been bonded.
 */
export const onDisconnection = (handler: DisconnectionHandler): void => {
  getProvider().onDisconnection(handler)
}

/**
 * Returns presence information for all clients in a room.
 *
 * @param roomId - The room to query.
 * @returns Array of presence info for each connected client.
 * @throws {Error} If no realtime provider has been bonded.
 */
export const getPresence = async (roomId: string): Promise<PresenceInfo[]> => {
  return getProvider().getPresence(roomId)
}

/**
 * Returns all active rooms.
 *
 * @returns Array of active rooms.
 * @throws {Error} If no realtime provider has been bonded.
 */
export const getRooms = async (): Promise<Room[]> => {
  return getProvider().getRooms()
}

/**
 * Shuts down the bonded realtime provider and cleans up resources.
 *
 * @returns Resolves when sockets and timers are torn down.
 * @throws {Error} If no realtime provider has been bonded.
 */
export const close = async (): Promise<void> => {
  return getProvider().close()
}
