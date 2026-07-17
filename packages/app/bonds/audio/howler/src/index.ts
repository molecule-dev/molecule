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
 * import { provider } from '@molecule/app-audio-howler'
 * import { setProvider } from '@molecule/app-audio'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './player.js'
export * from './provider.js'
export * from './types.js'
