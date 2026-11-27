/**
 * Audio player for React DOM and React Native with play, pause, seek,
 * elapsed/total time, mute, and optional WebVTT captions.
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
 * @remarks
 * Pass a React node to `visualizer` to render a waveform above the controls.
 * The time display shows `0:00` until playback metadata arrives.
 * Browsers can block `autoPlay` until the first user interaction.
 * On React Native, bond an `@molecule/app-audio` provider at startup. Expo apps
 * can use `@molecule/app-audio-expo` and a device-accessible media URL.
 * Translations come from the companion `@molecule/app-locales-audio-player`
 * locale bond.
 *
 * @e2e
 * - [ ] Play, pause, seek, mute and unmute a track from both renderers.
 * - [ ] Confirm elapsed time, duration, captions and the end callback follow playback.
 *
 * @module
 */

export * from './AudioPlayer.js'
