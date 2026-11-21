/**
 * Audio waveform — stylized SVG renderer of pre-computed audio peaks
 * with progress overlay, click-to-seek, and timed region markers.
 *
 * Svelte counterpart of `@molecule/app-feature-audio-waveform-react`: the same
 * props (React names), the same DOM for the same input.
 *
 * Used by music-daw, podcast, and music-streaming surfaces to display
 * a waveform of the underlying audio source. Peak amplitudes must be
 * computed by the caller (typically offline with `wavesurfer.js`,
 * `peaks.js`, or an `AudioContext` analysis pass) — this package is
 * intentionally just the renderer.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { AudioWaveform } from '@molecule/app-feature-audio-waveform-svelte'
 *
 *   let { peaks, duration, current } = $props()
 * </script>
 *
 * <AudioWaveform
 *   {peaks}
 *   {duration}
 *   currentTime={current}
 *   onSeek={(seconds) => {
 *     // move the audio element to `seconds`
 *   }}
 *   regions={[{ id: 'loop', startTime: 12, duration: 3, color: '#a78bfa55' }]}
 * />
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap — rendering throws otherwise.
 * - Text (aria labels + the empty state) routes through the binding's
 *   `useTranslation()`, so a locale switch re-renders it.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
export * from './utilities.js'
