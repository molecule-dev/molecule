/**
 * LiveKit video rooms provider for molecule.dev.
 *
 * Implements the `@molecule/api-video-rooms` interface against the
 * LiveKit Server API (Twirp transport) and the `livekit-server-sdk`
 * `AccessToken` HS256 JWT signer. Self-hostable + LiveKit Cloud — the
 * recommended provider for users who need to keep media on their own
 * infrastructure.
 *
 * @remarks
 * - **LiveKit rooms are always token-gated — there is no `public` mode.**
 *   Every join needs a token from `createMeetingToken()`, and the returned
 *   `Room.url` is the server's `wss://` endpoint (not a click-to-join link).
 *   A `private` room is therefore LiveKit's native, enforced behaviour and is
 *   reported truthfully. Requesting `createRoom({ privacy: 'public' })`
 *   **throws** — this bond will not return a room falsely labelled `public`.
 * - **`recording: true` requires a configured egress output.** LiveKit
 *   records via Egress, which needs a storage destination (S3 / GCP / Azure /
 *   AliOSS file output, or a stream/segment output) — a destination the core
 *   `recording` flag does not carry. Supply it via `config.recordingEgress`
 *   (a LiveKit `RoomEgress`, or a `(roomName) => RoomEgress` factory); the
 *   bond attaches it to the room so LiveKit auto-starts a room-composite
 *   egress once the room is active. `createRoom({ recording: true })`
 *   **throws** when `recordingEgress` is not configured — it never returns a
 *   room that silently isn't recording.
 * - `listRecordings()` reflects the real LiveKit Egress state (it calls
 *   `EgressClient.listEgress`): an empty result means no egress ran, not a
 *   swallowed failure.
 * - `expiresAt` on `createRoom` maps to LiveKit's `emptyTimeout` (how long
 *   an empty room survives), not an absolute expiry.
 * - All meeting tokens grant `canPublish` + `canSubscribe`; `isOwner` adds
 *   `roomAdmin` — there is no subscribe-only token option in this revision.
 * - `createProvider()` throws at bond time when LIVEKIT_URL /
 *   LIVEKIT_API_KEY / LIVEKIT_API_SECRET are unset.
 * - **Wire it through the core's `setProvider()`** from `@molecule/api-video-rooms` (not
 *   `bond('video-rooms-livekit', ...)`), then call the core's `createRoom()` /
 *   `createMeetingToken()` / `getRoom()` / `deleteRoom()` / `listRecordings()`.
 * - `createRoom()` ALSO returns an owner token (`room.token`, `roomAdmin` grant) — hand that
 *   to the creator only; issue every other participant their own `createMeetingToken()`.
 *   `userName` becomes the token's LiveKit `identity`, so give each participant a UNIQUE
 *   one (two joins with the same identity kick each other out); without `userName` a random
 *   `participant-<uuid>` identity is generated.
 * - The API secret is server-only: send `{ url: room.url, token }` to the client, which
 *   connects with a LiveKit client SDK. Tokens are HS256 JWTs signed locally — issuing one
 *   makes no network call.
 *
 * @example
 * ```typescript
 * import { createMeetingToken, createRoom, setProvider } from '@molecule/api-video-rooms'
 * import { createProvider } from '@molecule/api-video-rooms-livekit'
 *
 * // Startup. Env: LIVEKIT_URL (wss:// or https://), LIVEKIT_API_KEY, LIVEKIT_API_SECRET
 * // — createProvider() throws right here if any is missing.
 * setProvider(
 *   createProvider({
 *     host: process.env.LIVEKIT_URL,
 *     apiKey: process.env.LIVEKIT_API_KEY,
 *     apiSecret: process.env.LIVEKIT_API_SECRET,
 *   }),
 * )
 *
 * // No `privacy: 'public'` (throws) and no `recording: true` without `recordingEgress` (throws).
 * const room = await createRoom({ name: 'standup-2026-10-01', maxParticipants: 10 })
 * // room.url → 'wss://…' (the server, not a join link); room.token → the creator's owner token
 *
 * const token = await createMeetingToken(room.name, {
 *   userName: 'grace-hopper', // becomes the LiveKit identity — unique per participant
 *   expiresAt: new Date(Date.now() + 60 * 60 * 1000), // a Date; default TTL is 6 hours
 * })
 * // Send { url: room.url, token } to the participant's LiveKit client SDK.
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
