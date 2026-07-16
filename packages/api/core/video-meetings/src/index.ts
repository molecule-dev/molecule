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
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Scheduling a meeting from the UI (topic, start time, duration) calls
 *   `createMeeting` and persists it: the returned `joinUrl` (plus
 *   `meetingCode`/`password` if shown) is saved with the meeting and the new
 *   meeting appears in the user's own list (`listMeetings`) at the right time.
 * - [ ] The join URL/token is per-meeting and scoped: each meeting has its own
 *   `joinUrl` (+ password if set), not one static guessable link that lets
 *   anyone in; opening it reaches THAT meeting only. The host-only `startUrl`
 *   is NEVER handed to a participant view.
 * - [ ] Editing the meeting (new time, topic, or settings) calls
 *   `updateMeeting` and the change shows in the list and detail; if the app
 *   models invitees/attendees, adding or removing one updates the meeting's
 *   own record while the `joinUrl` still resolves to the same meeting.
 * - [ ] Cancelling a meeting calls `deleteMeeting`, drops it from the user's
 *   list, and is idempotent (deleting an already-gone meeting shows a clean
 *   state, not a crash). If the app exposes a recording (`autoRecording:
 *   'cloud'`), the artifact is retrievable through the app's OWN
 *   storage/endpoint — never a raw provider URL.
 * - [ ] A returning host re-opening "their meeting" reuses the SAME persisted
 *   meeting (same `id`/`joinUrl`), not a fresh duplicate on every visit.
 * Caveat: real audio/video and the third-party meeting client can't be driven
 * in the sandbox — you cannot join the live call. Verify the meeting LIFECYCLE
 * and the token/URL generation you own (create → list → update → delete, and
 * the `joinUrl`/`startUrl` split) against the app's own persisted meeting
 * record, not the in-call experience. Never mock the flow or edit production
 * code to fake it.
 * - [ ] SECURITY — provider API keys/secrets (`ZOOM_ACCOUNT_ID`,
 *   `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, and any bonded provider's keys)
 *   stay server-side: they never appear in a client response or the app
 *   bundle, and the host-only `startUrl` never reaches an invitee. Only
 *   authorized users (host or invited participants) can fetch a meeting's join
 *   token/details — a different user id-guessing another meeting's id gets a
 *   403/404, not its `joinUrl`.
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
export * from './video-meetings.js'
