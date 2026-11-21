/**
 * Audio waveform — stylized SVG renderer of pre-computed audio peaks
 * with progress overlay, click-to-seek, and timed region markers.
 *
 * Vue counterpart of `@molecule/app-feature-audio-waveform-react`: the same
 * props (React names), the same DOM for the same input.
 *
 * Used by music-daw, podcast, and music-streaming surfaces to display
 * a waveform of the underlying audio source. Peak amplitudes must be
 * computed by the caller (typically offline with `wavesurfer.js`,
 * `peaks.js`, or an `AudioContext` analysis pass) — this package is
 * intentionally just the renderer.
 *
 * @example
 * ```ts
 * import { defineComponent, h } from 'vue'
 * import { AudioWaveform } from '@molecule/app-feature-audio-waveform-vue'
 *
 * const Player = defineComponent({
 *   props: { peaks: Array, duration: Number, currentTime: Number },
 *   setup(props) {
 *     return () =>
 *       h(AudioWaveform, {
 *         peaks: props.peaks,
 *         duration: props.duration,
 *         currentTime: props.currentTime,
 *         onSeek: (seconds: number) => {
 *           // move the audio element to `seconds`
 *         },
 *         regions: [{ id: 'loop', startTime: 12, duration: 3, color: '#a78bfa55' }],
 *       })
 *   },
 * })
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap — rendering throws otherwise.
 * - Text (aria labels + the empty state) routes through the binding's
 *   `useTranslation()`, so a locale switch re-renders it.
 *
 * @module
 */

export * from './AudioWaveform.js'
export * from './types.js'
