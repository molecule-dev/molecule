/**
 * `@molecule/app-video-hls` — an hls.js-backed provider for `@molecule/app-video`
 * that adds HLS (`.m3u8`) streaming playback in EVERY browser. The built-in HTML5
 * provider only plays HLS in Safari; this bond plays it everywhere via hls.js,
 * with automatic adaptive bitrate. Progressive MP4/WebM still play through the
 * native element.
 *
 * @example
 * ```typescript
 * import { createPlayer, setProvider } from '@molecule/app-video'
 * import type { QualityLevel } from '@molecule/app-video'
 * import { provider } from '@molecule/app-video-hls'
 *
 * // Startup (bonds.ts): bond once — createPlayer() throws until a provider is bonded.
 * setProvider(provider)
 *
 * // Anywhere: the container must be in the DOM and sized; the <video> fills it.
 * const container = document.createElement('div')
 * document.body.append(container)
 *
 * const player = await createPlayer({
 *   container,
 *   sources: [
 *     { src: 'https://cdn.example.com/movie/master.m3u8', type: 'application/x-mpegurl' },
 *     { src: 'https://cdn.example.com/movie/720p.mp4', type: 'video/mp4' }, // no-HLS fallback
 *   ],
 *   controls: true,
 *   playsinline: true,
 * })
 *
 * // Variants exist only after the manifest loads — read them on 'loadedmetadata'.
 * let levels: QualityLevel[] = []
 * player.on('loadedmetadata', () => {
 *   levels = player.getQualityLevels() // [{ id: -1, label: 'Auto' }, { id: 0, label: '720p' }, …]
 *   console.log(levels.map((level) => level.label))
 * })
 * const pickQuality = (level: QualityLevel): void => player.setQuality(level) // -1 = back to Auto
 *
 * // On unmount: stops hls.js network + buffers and removes the <video>.
 * const unmount = (): void => player.destroy()
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
 * - `getQualityLevels()` called right after `createPlayer()` returns only
 *   `[Auto]` — hls.js fills its levels once the manifest is parsed; read them on
 *   `'loadedmetadata'` (or later). Level `bitrate` is in kbps.
 * - `createPlayer()` from the core may return a Promise — always `await` it.
 * - BROWSER-ONLY: attaches to a DOM `<video>` element. Import + wire from app code.
 *
 * @module
 */

export * from './provider.js'
