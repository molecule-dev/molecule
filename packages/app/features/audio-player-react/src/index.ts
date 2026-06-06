/**
 * HTML5 audio player.
 *
 * Exports `<AudioPlayer>`.
 *
 * @example
 * ```tsx
 * import { AudioPlayer } from '@molecule/app-audio-player-react'
 *
 * <AudioPlayer
 *   src="/audio/episode-42.mp3"
 *   title="Episode 42: Getting Started"
 *   subtitle="The Molecule Podcast"
 *   onPlay={() => console.log('playing')}
 *   onEnded={() => console.log('finished')}
 * />
 * ```
 *
 * @module
 */

export * from './AudioPlayer.js'
