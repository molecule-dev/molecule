/**
 * Video rooms convenience functions that delegate to the bonded provider.
 *
 * @module
 */

import { getProvider } from './provider.js'
import type {
  CreateMeetingTokenOptions,
  CreateRoomOptions,
  Recording,
  Room,
  RoomCreated,
} from './types.js'

/**
 * Creates a new video room using the bonded provider.
 *
 * @param options - Room creation options.
 * @returns The created room, including its joinable URL.
 * @throws {Error} If no video rooms provider has been bonded.
 */
export const createRoom = async (options: CreateRoomOptions = {}): Promise<RoomCreated> => {
  return getProvider().createRoom(options)
}

/**
 * Deletes an existing room by name using the bonded provider.
 *
 * @param name - The room name / identifier.
 * @throws {Error} If no video rooms provider has been bonded.
 */
export const deleteRoom = async (name: string): Promise<void> => {
  return getProvider().deleteRoom(name)
}

/**
 * Retrieves an existing room by name using the bonded provider.
 *
 * @param name - The room name / identifier.
 * @returns The room if it exists, otherwise `null`.
 * @throws {Error} If no video rooms provider has been bonded.
 */
export const getRoom = async (name: string): Promise<Room | null> => {
  return getProvider().getRoom(name)
}

/**
 * Issues a signed meeting token (join credential) for a room using the
 * bonded provider.
 *
 * @param roomName - The room the token is scoped to.
 * @param options - Token options (owner flag, display name, expiry).
 * @returns The signed token string.
 * @throws {Error} If no video rooms provider has been bonded.
 */
export const createMeetingToken = async (
  roomName: string,
  options?: CreateMeetingTokenOptions,
): Promise<string> => {
  return getProvider().createMeetingToken(roomName, options)
}

/**
 * Lists cloud recordings produced by a room using the bonded provider.
 *
 * @param roomName - The room to list recordings for.
 * @returns The list of recordings, possibly empty.
 * @throws {Error} If no video rooms provider has been bonded.
 */
export const listRecordings = async (roomName: string): Promise<Recording[]> => {
  return getProvider().listRecordings(roomName)
}
