/**
 * HLS media streaming provider for molecule.dev.
 *
 * Provides HLS (HTTP Live Streaming) support via ffmpeg for media segmentation
 * and transcoding, with pure-TypeScript M3U8 playlist generation. Requires
 * ffmpeg to be installed on the host system.
 *
 * @example
 * ```typescript
 * import { setProvider, createStream } from '@molecule/api-media-streaming'
 * import { provider } from '@molecule/api-media-streaming-hls'
 *
 * setProvider(provider)
 *
 * const manifest = await createStream('/path/to/video.mp4', {
 *   segmentDuration: 6,
 *   protocol: 'hls',
 * })
 * console.log(manifest.manifestUri) // '/hls-…/index.m3u8'
 * ```
 *
 * @remarks
 * - **String inputs must be local absolute file paths.** `createStream()` and
 *   `transcode()` accept `Buffer | string`; a string is passed straight to
 *   ffmpeg's `-i`, and ffmpeg natively fetches `http(s)`, `tcp`, `tls`, and
 *   more — so an unvalidated string would make the bond an SSRF / file-read
 *   primitive acting with your server's network position. Strings that
 *   contain `://`, carry a `scheme:` prefix, or are not absolute paths are
 *   rejected with a thrown error. For remote media, fetch the bytes yourself
 *   (with your own SSRF guard) and pass a `Buffer`. As defense-in-depth the
 *   ffmpeg protocol whitelist is trimmed to local protocols (`file,crypto`) —
 *   network protocols are never enabled.
 * - **Requires the `ffmpeg` binary on the host** (resolved via PATH, or set
 *   `createProvider({ ffmpegPath })`). A missing binary fails at first
 *   `createStream()`/`transcode()` call with `spawn ffmpeg ENOENT` — verify
 *   with `ffmpeg -version` before shipping.
 * - **The default output directory is `os.tmpdir()`** — volatile and served by
 *   nothing. Pass `createProvider({ outputBasePath })` pointing at a directory
 *   your server exposes (see the core remarks), or serve bytes through
 *   `getSegment()` / `generateManifest()` endpoints.
 * - `createStream()` also caches every segment `Buffer` in an in-process map
 *   (never evicted) so `getSegment()` is fast; memory grows by the full video
 *   size per stream. `getSegment()` disk fallback looks ONLY under
 *   `outputBasePath/<streamId>/` — a per-call `createStream(..., { outputPath })`
 *   override writes segments where the fallback cannot find them after a
 *   restart, and `transcode()` ignores `outputPath` entirely (always writes
 *   under `outputBasePath`).
 * - `ffprobePath` in `HlsConfig` is currently RESERVED — no ffprobe call exists
 *   yet; segment durations come from the requested `segmentDuration`.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './m3u8.js'
export * from './provider.js'
export * from './types.js'
export * from './validate.js'
