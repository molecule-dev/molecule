/**
 * Video rooms core interface for molecule.dev.
 *
 * Defines the standard interface for real-time video room providers
 * (Daily.co, LiveKit, Twilio Video, Agora, etc.). Used by apps such as
 * virtual classrooms, telemedicine, video conferencing, and screen
 * sharing.
 *
 * @remarks
 * - **Bond first.** Every call throws until `setProvider(...)` runs.
 * - `createRoom()` does NOT return a join token with the Daily.co bond — call
 *   `createMeetingToken()` for each participant.
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
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one by
 * one. A box you can't check is an integration bug to fix — not a skip.
 * CAVEAT: the live A/V call and the in-room video UI run inside the provider's
 * client and CANNOT be driven in the sandbox — verify the room LIFECYCLE and the
 * per-participant join TOKENS you mint server-side, never the media itself:
 * - [ ] Creating a room returns a usable handle: `createRoom(...)` yields a
 *   `RoomCreated` with a stable `name` and a joinable `url`, and the app persists
 *   that `name` on its own record — not a throwaway URL it can never resolve again.
 * - [ ] Each participant gets its OWN token: the app calls
 *   `createMeetingToken(room.name, { userName, expiresAt, isOwner })` per user, so
 *   two joiners receive two DISTINCT, short-lived credentials — never one static
 *   shared secret reused for everyone.
 * - [ ] The token honors role + scope + expiry: an owner/moderator token
 *   (`isOwner: true`) differs from a plain-participant token, each is scoped to the
 *   single `room.name` it was minted for (it admits no other room), and it carries
 *   the requested `expiresAt` — inspect the minted token's claims; don't assume it,
 *   and don't hand an owner token to an ordinary participant.
 * - [ ] `getRoom(name)` reflects real state: a created room resolves with its
 *   configured `privacy`/`maxParticipants`/`recording`, and after `deleteRoom(name)`
 *   it returns `null` — ending a room actually removes it, so its old URL/tokens no
 *   longer admit a join. (Live participant count is NOT in the core `Room` type —
 *   don't assert on it.)
 * - [ ] Size/quota holds: if the app sets `maxParticipants`, the created room
 *   carries that cap (the provider enforces it at join) — it isn't silently dropped.
 * - [ ] SECURITY — the provider API key (e.g. `DAILY_CO_API_KEY`) stays server-side;
 *   the browser only ever receives a token/URL your endpoint returned, never the key
 *   or a direct provider call. Private rooms are un-guessable: only an authorized
 *   user's request mints a token, and no unauthenticated caller joins a `private`
 *   room by guessing its `name`/URL without one.
 *
 * @example
 * ```typescript
 * import {
 *   createMeetingToken,
 *   createRoom,
 *   listRecordings,
 *   setProvider,
 * } from '@molecule/api-video-rooms'
 * import { createProvider } from '@molecule/api-video-rooms-daily-co'
 *
 * // Startup. The Daily.co bond THROWS here if DAILY_CO_API_KEY is missing (server-only key).
 * setProvider(createProvider({ apiKey: process.env.DAILY_CO_API_KEY }))
 *
 * const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000) // Dates, not seconds
 * const room = await createRoom({
 *   name: 'class-101',
 *   privacy: 'private', // default is PUBLIC — anyone with the URL could join
 *   maxParticipants: 30,
 *   recording: true,
 *   expiresAt: oneHourFromNow,
 * })
 * // Persist room.name on your own record.
 *
 * // One short-lived token PER participant (isOwner only for the host).
 * const studentToken = await createMeetingToken(room.name, {
 *   userName: 'Ada',
 *   expiresAt: oneHourFromNow,
 * })
 * // Return { url: room.url, token: studentToken } to that user's client — never the API key.
 *
 * // After the session: recordings (duration in SECONDS; downloadUrl expires — copy it promptly).
 * const recordings = await listRecordings(room.name)
 * const ready = recordings.filter((recording) => recording.status === 'ready')
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
export * from './video-rooms.js'
