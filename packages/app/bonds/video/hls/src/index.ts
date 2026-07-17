/**
 * `@molecule/app-video-hls` — an hls.js-backed provider for `@molecule/app-video`
 * that adds HLS (`.m3u8`) streaming playback in EVERY browser. The built-in HTML5
 * provider only plays HLS in Safari; this bond plays it everywhere via hls.js,
 * with automatic adaptive bitrate. Progressive MP4/WebM still play through the
 * native element.
 *
 * @example
 * ```ts
 * // Wire once at startup:
 * import { setProvider, createPlayer } from '@molecule/app-video'
 * import { provider } from '@molecule/app-video-hls'
 * setProvider(provider)
 *
 * // then anywhere (the container needs a size; the player fills it):
 * const el = document.getElementById('player') as HTMLElement
 * const player = await createPlayer({
 *   container: el,
 *   sources: [{ src: 'https://example.com/stream.m3u8', type: 'application/x-mpegurl' }],
 *   controls: true,
 * })
 * // adaptive bitrate is automatic; list variants via player.getQualityLevels()
 * // …later, on unmount: player.destroy()
 * ```
 *
 * @remarks
 * - This provider REUSES the native HTML5 player for all controls (play/pause/
 *   seek/volume/fullscreen/pip/text-tracks/events) and swaps in hls.js ONLY for
 *   loading the stream + exposing real adaptive quality levels — so behaviour
 *   matches the native provider everywhere except HLS source loading.
 * - Mark the stream as a source with `type: 'application/x-mpegurl'` (or a URL
 *   ending in `.m3u8`). You may also list an MP4 fallback source for browsers
 *   with no HLS support at all.
 * - On Safari/iOS, HLS plays through the native `<video>` element (hls.js is not
 *   used); `getQualityLevels()` then falls back to the native source list.
 * - `getQualityLevels()` prepends `{ id: -1, label: 'Auto' }`; pass it (or `-1`)
 *   to `setQuality()` to return to adaptive bitrate.
 * - HLS only — `.mpd` (MPEG-DASH) is NOT supported (`supportsDash()` is false).
 *   For DASH, implement `VideoProvider` against Shaka Player or dash.js.
 * - ALWAYS `player.destroy()` on unmount — it tears down the hls.js instance
 *   (network + buffers) as well as the video element.
 * - BROWSER-ONLY: attaches to a DOM `<video>` element. Import + wire from app code.
 *
 * @module
 */

export * from './provider.js'
