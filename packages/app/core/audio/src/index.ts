/**
 * Audio player core interface for molecule.dev.
 *
 * Provides a standardized API for audio playback. Bond a provider
 * (e.g. `@molecule/app-audio-howler`) to supply the concrete implementation.
 *
 * @remarks
 * - **Wire it with THIS package's `setProvider()` — NOT `bond('audio', …)`.** This core
 *   keeps its own local singleton and does not read the `@molecule/app-bond` registry;
 *   `requireProvider()` throws until `setProvider()` has run.
 * - **Browsers block autoplay.** `autoplay: true` or `play()` outside a user gesture is
 *   silently ignored until the user has interacted with the page — start playback from a
 *   click/tap handler, and treat "no sound on page load" as policy, not a bug.
 * - `destroy()` the player when its view unmounts — leaked instances keep buffers and
 *   callbacks alive across navigation.
 * - `getDuration()` returns 0 until the audio metadata has loaded; read it in
 *   `onProgress` (or after playback starts), not synchronously after `createPlayer`.
 *
 * @module
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/app-audio'
 * import { provider } from '@molecule/app-audio-howler'
 *
 * setProvider(provider) // at startup
 *
 * const player = requireProvider().createPlayer({
 *   src: '/audio/track.mp3',
 *   volume: 0.8,
 *   onEnd: () => console.log('Playback finished'),
 * })
 * playButton.onclick = () => player.play() // user gesture — autoplay is blocked
 * ```
 */

export * from './provider.js'
export * from './types.js'
