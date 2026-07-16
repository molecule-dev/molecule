/**
 * Provider-agnostic media streaming interface for molecule.dev.
 *
 * Defines the `StreamingProvider` interface for creating adaptive bitrate
 * streams, transcoding media into multiple quality variants, generating
 * manifests, and retrieving individual stream segments. Bond packages
 * (HLS, DASH, etc.) implement this interface. Application code uses the
 * convenience functions (`createStream`, `transcode`, `generateManifest`,
 * `getSegment`) which delegate to the bonded provider.
 *
 * @remarks
 * - **Transcoding and stream creation are long-running CPU work** — minutes for
 *   real videos, not request-scoped. Kick them off from a background job/queue
 *   and persist the returned ids + status; never `await transcode(...)` inline
 *   in an upload request with the client hanging.
 * - **The app must SERVE what this creates.** Returned manifest/segment URIs
 *   only work if they resolve over HTTP: either point `outputPath` at a
 *   directory your server actually exposes, or wire endpoints that return
 *   `generateManifest(segments)` (correct manifest content-type) and stream
 *   `getSegment(streamId, index)` bytes. Writing segments to an unserved dir
 *   ships a player full of 404s.
 * - `generateManifest` is synchronous (no await); `getSegment` resolves
 *   segments for a previously created stream — persist `StreamManifest.id`
 *   with your media record.
 * - Runtime prerequisites (e.g. an ffmpeg binary for real transcoding) are
 *   bond-specific — check the bonded package's docs before shipping.
 *
 * @example
 * ```typescript
 * import { setProvider, createStream, transcode } from '@molecule/api-media-streaming'
 * import { provider as hls } from '@molecule/api-media-streaming-hls'
 *
 * setProvider(hls)
 *
 * const manifest = await createStream('/path/to/video.mp4', {
 *   segmentDuration: 6,
 *   protocol: 'hls',
 * })
 *
 * const result = await transcode('/path/to/video.mp4', [
 *   { name: '720p', width: 1280, height: 720, videoBitrate: 2_500_000, audioBitrate: 128_000 },
 *   { name: '1080p', width: 1920, height: 1080, videoBitrate: 5_000_000, audioBitrate: 192_000 },
 * ])
 * ```
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual upload/player screens, and check every box
 * off one by one. A box you can't check is an integration bug to fix — not a
 * skip. You can't judge real transcode QUALITY or a live A/V feed in the
 * sandbox; verify the pipeline + playback WIRING you own:
 * - [ ] Uploading/ingesting a media asset produces a real PLAYABLE stream: the
 *   returned `manifestUri` (`.m3u8` for HLS / `.mpd` for DASH) loads in the
 *   app's video player and actually plays — frames advance and the player
 *   fetches segments (watch the network panel), never a broken/blank player.
 * - [ ] The stream is served from/through the APP'S OWN origin — an
 *   `outputPath` under a directory the server exposes, or endpoints that return
 *   `generateManifest(segments)` and stream `getSegment(streamId, index)` bytes.
 *   The player must NOT hotlink a raw expiring provider URL, and no manifest or
 *   segment request may 404.
 * - [ ] Processing STATE is observable and playback is gated on it: an asset
 *   moves pending → processing → ready (StreamStatus), the UI reflects that,
 *   and the player mounts only once status is 'ready' — never a dead player on
 *   a still-transcoding asset.
 * - [ ] If adaptive bitrate is exposed, `transcode()` produced multiple
 *   renditions: the master manifest (`masterManifestUri`) lists more than one
 *   `variant` and the player can switch quality across them.
 * - [ ] If the app exposes a poster/thumbnail for an asset, it generates and
 *   renders before playback (no blank tile).
 * - [ ] SECURITY — private media is AUTHORIZED on playback: the manifest and
 *   segment endpoints check the requester (or hand out a signed/expiring URL),
 *   so a user CANNOT fetch another user's stream by guessing its `id`/URL; and
 *   provider keys stay server-side (never shipped to the client bundle).
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
