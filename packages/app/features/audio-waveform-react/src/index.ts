/**
 * Audio waveform — stylized SVG renderer of pre-computed audio peaks
 * with progress overlay, click-to-seek, and timed region markers.
 *
 * Used by music-daw, podcast, and music-streaming surfaces to display
 * a waveform of the underlying audio source. Peak amplitudes must be
 * computed by the caller (typically offline with `wavesurfer.js`,
 * `peaks.js`, or an `AudioContext` analysis pass) — this package is
 * intentionally just the renderer.
 *
 * @example
 * ```tsx
 * import { AudioWaveform } from '@molecule/app-feature-audio-waveform-react'
 *
 * <AudioWaveform
 *   peaks={peaks}
 *   duration={track.duration}
 *   currentTime={audio.currentTime}
 *   onSeek={(s) => { audio.currentTime = s }}
 *   regions={[{ id: 'loop', startTime: 12, duration: 3, color: '#a78bfa55' }]}
 * />
 * ```
 *
 * @module
 */

export * from './AudioWaveform.js'
