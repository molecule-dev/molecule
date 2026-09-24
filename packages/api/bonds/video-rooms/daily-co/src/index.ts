/**
 * Daily.co video rooms provider for molecule.dev.
 *
 * Implements the `@molecule/api-video-rooms` interface using the Daily.co
 * REST API.
 *
 * @remarks
 * `createProvider()` throws at bond time when no API key is available
 * (config.apiKey or DAILY_CO_API_KEY) — an app wiring
 * `setProvider(createProvider())` at startup will not boot until the key is
 * set. `recording: true` maps to Daily.co cloud recording
 * (`enable_recording: 'cloud'`), which must be enabled on your Daily.co plan.
 *
 * - **Wire it through the core's `setProvider()`** from `@molecule/api-video-rooms` (not
 *   `bond('video-rooms-daily-co', ...)`), then call the core's `createRoom()` /
 *   `createMeetingToken()` / `getRoom()` / `deleteRoom()` / `listRecordings()`.
 * - **`createRoom()` does NOT return a `token`** with this bond (`RoomCreated.token` stays
 *   undefined) — call `createMeetingToken(room.name, ...)` separately. A `privacy: 'private'`
 *   room cannot be joined without one; rooms default to `public` (anyone with the URL joins).
 * - **`expiresAt` is a `Date`** (converted to Daily's unix seconds) — not seconds, not ms.
 *   `Recording.duration` is seconds.
 * - The API key is server-only: return `room.url` and the token to the client, never the key.
 * - `getRoom()` resolves `null` and `deleteRoom()` resolves quietly on a 404; any other API
 *   error throws `Daily.co request failed (<status>): <message>`. Uses the global `fetch`.
 *
 * @example
 * ```typescript
 * import { createMeetingToken, createRoom, setProvider } from '@molecule/api-video-rooms'
 * import { createProvider } from '@molecule/api-video-rooms-daily-co'
 *
 * // Startup. Env: DAILY_CO_API_KEY (server-only) — createProvider() throws here if it is missing.
 * setProvider(createProvider({ apiKey: process.env.DAILY_CO_API_KEY }))
 *
 * const room = await createRoom({
 *   name: 'standup-2026-10-01',
 *   privacy: 'private', // joiners need a meeting token
 *   maxParticipants: 10,
 *   expiresAt: new Date(Date.now() + 60 * 60 * 1000), // a Date — 1 hour from now
 * })
 *
 * // Issue a per-user join credential (createRoom() returns no token with this bond).
 * const token = await createMeetingToken(room.name, {
 *   userName: 'Ada Lovelace',
 *   isOwner: true,
 *   expiresAt: new Date(Date.now() + 60 * 60 * 1000),
 * })
 * // Send { url: room.url, token } to the client; it joins with the Daily.co client SDK.
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
