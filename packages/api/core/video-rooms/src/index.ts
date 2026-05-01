/**
 * Video rooms core interface for molecule.dev.
 *
 * Defines the standard interface for real-time video room providers
 * (Daily.co, LiveKit, Twilio Video, Agora, etc.). Used by apps such as
 * virtual classrooms, telemedicine, video conferencing, and screen
 * sharing.
 *
 * @module
 * @example
 * ```typescript
 * import {
 *   setProvider,
 *   createRoom,
 *   createMeetingToken,
 *   listRecordings,
 * } from '@molecule/api-video-rooms'
 *
 * // Bond a provider at startup (e.g. Daily.co)
 * setProvider(createProvider({ apiKey: process.env.DAILY_CO_API_KEY }))
 *
 * // Create a room
 * const room = await createRoom({
 *   name: 'class-101',
 *   privacy: 'private',
 *   maxParticipants: 30,
 *   recording: true,
 * })
 *
 * // Issue a join token for a student
 * const token = await createMeetingToken(room.name, {
 *   userName: 'Ada',
 *   expiresAt: new Date(Date.now() + 60 * 60_000),
 * })
 *
 * // After the meeting, list recordings
 * const recordings = await listRecordings(room.name)
 * ```
 */

export * from './provider.js'
export * from './types.js'
export * from './video-rooms.js'
