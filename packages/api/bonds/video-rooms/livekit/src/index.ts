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
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-video-rooms'
 * import { createProvider } from '@molecule/api-video-rooms-livekit'
 *
 * // Bond at startup (reads LIVEKIT_URL / LIVEKIT_API_KEY /
 * // LIVEKIT_API_SECRET by default)
 * setProvider(createProvider())
 *
 * // Explicit config. For real cloud recording, also pass `recordingEgress` — a
 * // LiveKit `RoomEgress` (built with RoomCompositeEgressRequest + EncodedFileOutput
 * // + your S3/GCP/Azure upload), or a `(roomName) => RoomEgress` factory; see the
 * // `recordingEgress` docs in @remarks. With it, `createRoom({ recording: true })`
 * // starts a real room-composite egress; WITHOUT it, that call throws rather than
 * // silently not recording.
 * setProvider(createProvider({
 *   host: 'https://livekit.example.com',
 *   apiKey: 'APIxxx',
 *   apiSecret: 'secretxxx',
 * }))
 * ```
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
