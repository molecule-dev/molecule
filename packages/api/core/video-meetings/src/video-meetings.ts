/**
 * Video meetings convenience functions that delegate to the bonded
 * provider.
 *
 * @module
 */

import { getProvider } from './provider.js'
import type {
  CreateMeetingOptions,
  ListMeetingsOptions,
  Meeting,
  MeetingPage,
  UpdateMeetingOptions,
} from './types.js'

/**
 * Creates a new scheduled meeting using the bonded provider.
 *
 * @param options - Meeting creation options.
 * @param userId - Optional user identifier or alias (default: `'me'`).
 * @returns The created meeting, including its join URL.
 * @throws {Error} If no video meetings provider has been bonded.
 */
export const createMeeting = async (
  options: CreateMeetingOptions,
  userId?: string,
): Promise<Meeting> => {
  return getProvider().createMeeting(options, userId)
}

/**
 * Retrieves an existing meeting by id using the bonded provider.
 *
 * @param meetingId - The provider meeting identifier.
 * @returns The meeting if it exists, otherwise `null`.
 * @throws {Error} If no video meetings provider has been bonded.
 */
export const getMeeting = async (meetingId: string): Promise<Meeting | null> => {
  return getProvider().getMeeting(meetingId)
}

/**
 * Updates an existing meeting in place using the bonded provider.
 *
 * @param meetingId - The provider meeting identifier.
 * @param patch - Partial update payload.
 * @returns The updated meeting after the change is applied.
 * @throws {Error} If no video meetings provider has been bonded.
 */
export const updateMeeting = async (
  meetingId: string,
  patch: UpdateMeetingOptions,
): Promise<Meeting> => {
  return getProvider().updateMeeting(meetingId, patch)
}

/**
 * Deletes an existing meeting by id using the bonded provider. Idempotent.
 *
 * @param meetingId - The provider meeting identifier.
 * @throws {Error} If no video meetings provider has been bonded.
 */
export const deleteMeeting = async (meetingId: string): Promise<void> => {
  return getProvider().deleteMeeting(meetingId)
}

/**
 * Lists meetings owned by the given user using the bonded provider.
 *
 * @param userId - The user identifier or alias (e.g. `'me'`).
 * @param options - Filtering and pagination options.
 * @returns A page of meetings.
 * @throws {Error} If no video meetings provider has been bonded.
 */
export const listMeetings = async (
  userId: string,
  options?: ListMeetingsOptions,
): Promise<MeetingPage> => {
  return getProvider().listMeetings(userId, options)
}
