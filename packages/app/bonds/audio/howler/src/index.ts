/**
 * STUB audio provider for `@molecule/app-audio` — state-only, NO SOUND.
 *
 * Despite the package name, this bond does not yet load Howler.js or any
 * audio backend: `play()`/`pause()`/`seek()` only mutate in-memory state,
 * `getDuration()` is always 0, and `options.src` is never fetched. It
 * satisfies the AudioProvider interface for tests and UI development, but
 * an app that needs AUDIBLE playback must implement a real provider (e.g.
 * wrap Howler or HTMLAudioElement) and wire that instead.
 *
 * `HowlerConfig.html5` and `HowlerConfig.volume` are currently ignored.
 *
 * @example
 * ```typescript
 * import { provider } from '@molecule/app-audio-howler'
 * import { setProvider } from '@molecule/app-audio'
 *
 * setProvider(provider) // state-only stub — see remarks
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
