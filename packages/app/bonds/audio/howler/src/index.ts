/**
 * Howler.js audio provider for `@molecule/app-audio` — real, audible playback.
 *
 * Bonds Howler.js (`new Howl({ src: [...] })`) behind the core `AudioProvider`
 * contract. Each player wraps a live `Howl`, so playback is genuinely audible
 * and every read reflects real Howler state: `getDuration()` returns the loaded
 * track's duration, `getCurrentTime()` reflects the real seek position,
 * `isPlaying()`/`getVolume()` read Howler directly, and `onEnd`/`onProgress`
 * are driven by Howler's own events.
 *
 * Core `AudioPlayerOptions` map onto Howler's constructor (`src` normalized to
 * an array, plus `loop`/`autoplay`/`volume`); the provider-level `HowlerConfig`
 * supplies the default `html5` backend and an optional global volume.
 *
 * @remarks
 * - **Not `bond('audio-howler', ...)` and no top-level `play()`.** Wire
 *   `setProvider(createProvider())` from `@molecule/app-audio`, then call
 *   `requireProvider().createPlayer({ src })` — every playback method lives on the returned player.
 * - **Times are seconds** (`seek`, `getCurrentTime`, `getDuration`, `onProgress`).
 * - **Browsers block autoplay.** `autoplay: true` or `play()` outside a user
 *   gesture is ignored until the user interacts with the page — start playback
 *   from a click/tap handler.
 * - **`getDuration()` is 0 until metadata loads.** Read it in `onProgress` (it
 *   emits once on Howler's `load` event) rather than synchronously right after
 *   `createPlayer`.
 * - **Call `destroy()` on unmount.** It stops the progress loop and calls
 *   `Howl.unload()` to release buffers and detach listeners.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/app-audio'
 * import { createProvider } from '@molecule/app-audio-howler'
 *
 * // Startup: bond once. `html5: true` streams large files; `volume` is Howler's global volume.
 * setProvider(createProvider({ html5: true, volume: 0.8 }))
 *
 * // Anywhere: create a player through the core provider.
 * const player = requireProvider().createPlayer({
 *   src: ['/audio/episode-12.webm', '/audio/episode-12.mp3'], // format fallbacks, in order
 *   volume: 0.9,
 *   onProgress: (time, duration) => console.log(`${Math.round(time)}s / ${Math.round(duration)}s`),
 *   onEnd: () => console.log('Episode finished'),
 * })
 *
 * // Call from a click/tap handler — browsers block audio before a user gesture.
 * player.play()
 * player.seek(30) // SECONDS, not ms
 *
 * // On unmount: stop the progress loop and release the audio buffers.
 * player.destroy()
 * ```
 *
 * @module
 */

export * from './player.js'
export * from './provider.js'
export * from './types.js'
