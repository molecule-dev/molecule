/**
 * Angular frame-accurate video scrubber — the counterpart of
 * `@molecule/app-feature-video-scrubber-react`: the same props and the same
 * DOM for the same input.
 *
 * Exports `<VideoScrubber>` (attribute selector `div[mol-video-scrubber]`, so
 * the host IS React's root element), the `Thumbnail` and `VideoScrubberProps`
 * types, the default constants, and the pure helpers `timeToFrame`,
 * `frameToTime`, `snapTimeToFrame`, `computeFilmstripTicks`,
 * `selectClosestThumbnail`, and `formatFrameNumber`.
 *
 * Timeline strip with thumbnail filmstrip, vertical playhead, frame-by-frame
 * keyboard stepping (Shift = ±1 second), and an optional frame-number readout.
 *
 * Composes well with `<VideoTimeline>` from
 * `@molecule/app-feature-video-timeline-angular` — the scrubber shows
 * preview thumbnails and frame-precision controls; the timeline shows
 * multi-track structure.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { VideoScrubber } from '@molecule/app-feature-video-scrubber-angular'
 *
 * @Component({
 *   selector: 'app-editor',
 *   standalone: true,
 *   imports: [VideoScrubber],
 *   template: `
 *     <div
 *       mol-video-scrubber
 *       [duration]="60"
 *       [currentTime]="currentTime"
 *       [fps]="24"
 *       [thumbnails]="thumbnails"
 *       (onSeek)="currentTime = $event"
 *     ></div>
 *   `,
 * })
 * export class Editor {
 *   currentTime = 3.2
 *   thumbnails = [
 *     { time: 0, src: 'data:image/png;base64,...' },
 *     { time: 5, src: 'data:image/png;base64,...' },
 *     { time: 10, src: 'data:image/png;base64,...' },
 *   ]
 * }
 * ```
 *
 * @remarks
 * `onSeek` is always called with frame-snapped times. Click anywhere on
 * the filmstrip to seek; press the strip with keyboard focus and use
 * arrows for ±1 frame, Shift+arrows for ±1 second, PageUp/PageDown for
 * ±10 frames, Home/End to jump to start/end.
 *
 * @module
 */

export * from './types.js'
export * from './video-scrubber.component.js'
