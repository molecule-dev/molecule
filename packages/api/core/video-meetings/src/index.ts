/**
 * Video meetings core interface for molecule.dev.
 *
 * Defines the standard interface for scheduled video-meeting providers
 * (Zoom, Google Meet, Microsoft Teams, Webex, etc.). Used by apps such
 * as meeting schedulers, calendar integrations, AI meeting notetakers,
 * and tele-counselling.
 *
 * Distinct from `@molecule/api-video-rooms` — meetings are scheduled
 * events with a start time, duration, and a stable join URL. Rooms are
 * ephemeral collaboration spaces with no scheduling semantics.
 *
 * @remarks
 * - **Server-side only.** Provider credentials (for the bundled Zoom bond:
 *   `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`) live in the API's env and
 *   must never reach the browser. Create/update/list meetings in YOUR API; hand the client
 *   only what it needs — usually the meeting's `joinUrl`.
 * - **Unsupported {@link MeetingSettings} flags are silently IGNORED, not rejected** — a
 *   2xx response does not prove `waitingRoom`/`autoRecording` took effect on every
 *   provider. Don't advertise a setting in the UI unless the bonded provider supports it.
 * - Recurrence configuration is provider-specific and travels through `settings.extra`;
 *   only `type: 'recurring'` is normalized.
 * - `listMeetings` defaults to `type: 'scheduled'` and paginates via
 *   `MeetingPage.nextPageToken` → `options.pageToken` — a single call is not "all meetings".
 * - Scheduled meetings ≠ ad-hoc rooms: for ephemeral join-now collaboration spaces use
 *   `@molecule/api-video-rooms` instead.
 *
 * @module
 * @example
 * ```typescript
 * import {
 *   setProvider,
 *   createMeeting,
 *   listMeetings,
 * } from '@molecule/api-video-meetings'
 * import { createProvider } from '@molecule/api-video-meetings-zoom'
 *
 * // Bond a provider at startup (reads ZOOM_* env vars when config is omitted)
 * setProvider(createProvider())
 *
 * // Schedule a meeting
 * const meeting = await createMeeting({
 *   topic: 'Quarterly review',
 *   startTime: new Date('2027-01-15T17:00:00Z'),
 *   durationMinutes: 60,
 *   settings: { waitingRoom: true, autoRecording: 'cloud' },
 * })
 *
 * // List the current user's upcoming meetings
 * const page = await listMeetings('me', { type: 'scheduled' })
 * ```
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
export * from './video-meetings.js'
