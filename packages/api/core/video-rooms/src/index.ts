/**
 * Video rooms core interface for molecule.dev.
 *
 * Defines the standard interface for real-time video room providers
 * (Daily.co, LiveKit, Twilio Video, Agora, etc.). Used by apps such as
 * virtual classrooms, telemedicine, video conferencing, and screen
 * sharing.
 *
 * @remarks
 * - **Rooms are PUBLIC by default.** `privacy` defaults to `'public'` when omitted — anyone
 *   with the room URL can join. For anything user-scoped, create the room with
 *   `privacy: 'private'` and mint short-lived per-user join tokens via
 *   `createMeetingToken(roomName, { userName, expiresAt })`.
 * - **Server-side only.** The provider API key (for the bundled Daily.co bond:
 *   `DAILY_CO_API_KEY`) stays in the API's env. The browser receives ONLY the join token /
 *   room URL your endpoint returns — never the key, and never direct provider API calls.
 * - `Recording.downloadUrl` is time-limited — download/persist promptly (e.g. via the
 *   uploads package); a stored URL will dead-link later.
 * - Ad-hoc rooms ≠ scheduled meetings: for calendar-style events with a start time and a
 *   stable invite link use `@molecule/api-video-meetings` instead.
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
 * import { createProvider } from '@molecule/api-video-rooms-daily-co'
 *
 * // Bond a provider at startup (reads DAILY_CO_API_KEY when config is omitted)
 * setProvider(createProvider())
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

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
export * from './video-rooms.js'
