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
 * - **`privacy` is decorative on LiveKit.** LiveKit has no public/private
 *   room modes — EVERY participant needs a token from
 *   `createMeetingToken()`, and the returned `Room.url` is the server's
 *   `wss://` endpoint (not a joinable link). The bond echoes `privacy` back
 *   on the room object but nothing enforces it; the core's "public rooms are
 *   joinable by URL" caveat does not apply to this bond.
 * - **`recording: true` does not start or configure recording.** LiveKit
 *   records via Egress, which this bond never starts — the flag is echoed
 *   back only, and `listRecordings()` stays empty unless an egress was
 *   started elsewhere.
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
 * // Or with explicit config
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
