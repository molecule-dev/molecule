/**
 * Video player interface for molecule.dev.
 *
 * A unified imperative API for video playback: `createPlayer()` builds a
 * `VideoPlayer` (play/pause/seek/volume/quality/fullscreen/PiP/captions/
 * events) from whatever `VideoProvider` is bonded, with a built-in native
 * HTML5 `<video>` provider as the default.
 *
 * @example
 * ```ts
 * import { createPlayer, setProvider, createNativeVideoProvider } from '@molecule/app-video'
 *
 * // Wire the provider once at startup (defaults to native HTML5 if skipped)
 * setProvider(createNativeVideoProvider())
 *
 * // Create a player imperatively against a DOM container
 * const player = await createPlayer({
 *   container: '#video-root',
 *   sources: [{ src: 'https://example.com/video.mp4', type: 'video/mp4', label: '1080p' }],
 *   poster: 'https://example.com/poster.jpg',
 *   autoplay: false,
 *   controls: true,
 * })
 *
 * player.on('ended', () => console.log('Playback finished'))
 * ```
 *
 * @remarks
 * Two shipped providers: the built-in native HTML5 one (default) and
 * **`@molecule/app-video-hls`**. For HLS (`.m3u8`) streaming that works in
 * EVERY browser (adaptive bitrate; the native provider only plays HLS in
 * Safari), bond it: `import { provider } from '@molecule/app-video-hls';
 * setProvider(provider)` at startup. For other libraries (Video.js / Plyr /
 * Vidstack) or MPEG-DASH, implement the `VideoProvider` interface yourself and
 * wire it with `setProvider()` (registered on the app bond registry under
 * 'video').
 *
 * Native-provider limits a weak integrator must know: MP4/WebM/Ogg only
 * (`supportsHls()` / `supportsDash()` return false — no HLS outside Safari's
 * native support unless you bond `@molecule/app-video-hls`, no DASH);
 * `controls` is effectively boolean —
 * passing a `ControlsConfig` object just enables the browser's native
 * controls and every granular toggle, `seekTime` and `playbackRates` are
 * ignored; `fluid`, `fill`, `aspectRatio`, `language`, `keyboard`,
 * `clickToPlay`, `doubleClickFullscreen`, `hideControlsDelay` and the
 * initial `playbackRate` are also ignored (the `<video>` is styled
 * 100%x100% of its container — size the container). `setQuality` accepts a
 * source index or label string; passing a `QualityLevel` object is
 * currently a no-op. Quality "levels" are just the `sources` array —
 * switching swaps `video.src` and restores the current time.
 *
 * Source-label strings route through `t('video.source.label')` — the
 * companion `@molecule/app-locales-video` bond translates them. For
 * ready-made React chrome see `@molecule/app-video-player-react` (a
 * standalone `<video>` wrapper; it does NOT consume this package).
 *
 * @module
 */

export * from './player.js'
export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
