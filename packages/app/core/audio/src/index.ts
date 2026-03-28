/**
 * Audio player core interface for molecule.dev.
 *
 * Provides a standardized API for audio playback. Bond a provider
 * (e.g. `@molecule/app-audio-howler`) to supply the concrete implementation.
 *
 * @module
 *
 * @example
 * ```typescript
 * import { requireProvider } from '@molecule/app-audio'
 *
 * const player = requireProvider().createPlayer({
 *   src: '/audio/track.mp3',
 *   volume: 0.8,
 *   onEnd: () => console.log('Playback finished'),
 * })
 * player.play()
 * ```
 */

export * from './provider.js'
export * from './types.js'
