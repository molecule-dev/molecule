/**
 * HTML5 audio player chrome — play/pause, scrub bar, elapsed/total time,
 * and a mute toggle, over a hidden `<audio>` element. Use for podcasts,
 * voice notes, music previews, narrated lessons.
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
 * There is NO volume slider — only a mute toggle; and no playback-rate
 * or skip controls. The optional `visualizer` prop is a free-form node
 * slot rendered above the controls (bring your own waveform). `autoPlay`
 * is passed to the `<audio>` element and is routinely blocked by
 * browsers until user interaction — never rely on it. Duration renders
 * `0:00` until `loadedmetadata` fires (`preload="metadata"`).
 * Translations come from the companion `@molecule/app-locales-audio-player`
 * locale bond.
 *
 * @module
 */

export * from './AudioPlayer.js'
