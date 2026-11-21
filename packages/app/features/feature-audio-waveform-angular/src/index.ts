/**
 * Audio waveform — stylized SVG renderer of pre-computed audio peaks
 * with progress overlay, click-to-seek, and timed region markers.
 *
 * Angular counterpart of `@molecule/app-feature-audio-waveform-react`: the same
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
 * import { Component } from '@angular/core'
 * import { AudioWaveform } from '@molecule/app-feature-audio-waveform-angular'
 *
 * @Component({
 *   selector: 'app-player',
 *   standalone: true,
 *   imports: [AudioWaveform],
 *   template: `
 *     <div
 *       mol-audio-waveform
 *       [peaks]="peaks"
 *       [duration]="duration"
 *       [currentTime]="current"
 *       [onSeek]="seek"
 *       [regions]="regions"
 *     ></div>
 *   `,
 * })
 * export class Player {
 *   peaks: number[] = []
 *   duration = 0
 *   current = 0
 *   regions = [{ id: 'loop', startTime: 12, duration: 3, color: '#a78bfa55' }]
 *   seek = (seconds: number): void => {
 *     // move the audio element to `seconds`
 *   }
 * }
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap — rendering throws otherwise.
 * - The host IS the root `<div>`; `role`, `aria-label`, `data-mol-id`, the
 *   empty state's `data-state`, the classes and the inline style live on it.
 * - Text (aria labels + the empty state) routes through the binding's
 *   `useTranslation()`, so a locale switch re-renders it.
 *
 * @module
 */

export * from './audio-waveform.component.js'
export * from './types.js'
export * from './utilities.js'
