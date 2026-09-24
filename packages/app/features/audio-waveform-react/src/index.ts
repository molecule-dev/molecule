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
 * import { useState } from 'react'
 *
 * import { AudioWaveform, type WaveformRegion } from '@molecule/app-feature-audio-waveform-react'
 *
 * export function TrackWaveform() {
 *   // Normalised 0..1 peaks, one bar each — computed offline for the track.
 *   const peaks = [0.2, 0.5, 0.9, 0.6, 0.3, 0.8, 1, 0.4, 0.7, 0.25]
 *   const durationSeconds = 60
 *   const [currentTime, setCurrentTime] = useState(15)
 *   const regions: WaveformRegion[] = [{ id: 'chorus', startTime: 12, duration: 3 }]
 *   return (
 *     <AudioWaveform
 *       peaks={peaks}
 *       duration={durationSeconds}
 *       currentTime={currentTime}
 *       onSeek={setCurrentTime}
 *       regions={regions}
 *       height={64}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - **It does not decode or play audio.** Compute `peaks` yourself (normalised `0..1`, one bar
 *   per entry; out-of-range values are clamped) and drive `currentTime` from your player —
 *   in a real app, call `audio.currentTime = s` in `onSeek` and feed `timeupdate` back in.
 * - `duration`, `currentTime`, region `startTime`/`duration` are all SECONDS. With
 *   `duration <= 0` clicks do nothing and regions are hidden; without `onSeek` the waveform is a
 *   non-interactive `role="img"`.
 * - Bars and the default region fill use `currentColor` — theme it via the parent's text colour.
 *   `waveColor`/`progressColor`/region `color` are CSS colours, not class names.
 * - It calls `useTranslation()` from `@molecule/app-react`, so it MUST render inside
 *   `<I18nProvider>` / `<MoleculeProvider>`; `getClassMap()` throws unless `setClassMap(classMap)`
 *   ran at startup. An empty `peaks` array renders a "No waveform data available." message.
 *
 * @module
 */

export * from './AudioWaveform.js'
