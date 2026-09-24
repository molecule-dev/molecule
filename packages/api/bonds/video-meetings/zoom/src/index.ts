/**
 * Zoom video meetings provider for molecule.dev.
 *
 * Implements the `@molecule/api-video-meetings` interface using the Zoom
 * REST v2 API.
 *
 * @remarks
 * `createProvider()` validates credentials EAGERLY: without an `accessToken`
 * resolver, any missing ZOOM_ACCOUNT_ID / ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET
 * throws at bond time — an app wiring `setProvider(createProvider())` at
 * startup will not boot until the secrets are set (unlike the sms bonds,
 * which defer validation to first send). Requires a Zoom "Server-to-Server
 * OAuth" app type for the env-credentials mode.
 *
 * - **Wire it through the core's `setProvider()`** from `@molecule/api-video-meetings`
 *   (not `bond('video-meetings-zoom', ...)`), then call the core's `createMeeting()` /
 *   `getMeeting()` / `updateMeeting()` / `deleteMeeting()` / `listMeetings(userId)`.
 * - **`durationMinutes` is MINUTES and `startTime` is a `Date`** (sent as ISO UTC) — not a
 *   string, not seconds. Passing a `startTime` without `type` makes a `scheduled` meeting;
 *   omitting both makes an `instant` one.
 * - `createMeeting(options, userId)` defaults `userId` to Zoom's `'me'` alias — with
 *   Server-to-Server OAuth, "me" is the app's owning user; pass a Zoom user id/email to
 *   schedule on another host's calendar.
 * - `startUrl` lets anyone START the meeting as host — show it only to the host, never to
 *   participants. Give participants `joinUrl`.
 * - `getMeeting()` resolves `null` and `deleteMeeting()` resolves quietly on a Zoom 404;
 *   every other API error throws `Zoom request failed (<status>): <message>`.
 * - Uses the runtime's global `fetch` (Node 20+); no Zoom SDK dependency.
 *
 * @example
 * ```typescript
 * import { createMeeting, setProvider } from '@molecule/api-video-meetings'
 * import { createProvider } from '@molecule/api-video-meetings-zoom'
 *
 * // Startup. Env (Server-to-Server OAuth app): ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID,
 * // ZOOM_CLIENT_SECRET — createProvider() throws right here if any is missing.
 * setProvider(
 *   createProvider({
 *     accountId: process.env.ZOOM_ACCOUNT_ID,
 *     clientId: process.env.ZOOM_CLIENT_ID,
 *     clientSecret: process.env.ZOOM_CLIENT_SECRET,
 *   }),
 * )
 *
 * const meeting = await createMeeting({
 *   topic: 'Design review',
 *   startTime: new Date('2026-10-01T16:00:00Z'), // a Date, not a string
 *   durationMinutes: 45, // minutes
 *   timezone: 'America/New_York',
 *   settings: { waitingRoom: true, muteUponEntry: true },
 * })
 * // meeting.joinUrl → share with participants; meeting.startUrl → host only
 * // meeting.id → persist it for getMeeting()/updateMeeting()/deleteMeeting()
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
