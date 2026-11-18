/**
 * Frame-accurate video scrubber for video-editor — timeline strip with
 * thumbnail filmstrip, vertical playhead, frame-by-frame keyboard
 * stepping (Shift = ±1 second), and an optional frame-number readout.
 *
 * Solid counterpart of `@molecule/app-feature-video-scrubber-react`: the same
 * props (React names), the same DOM for the same input, and the same
 * callbacks.
 *
 * Composes well with `<VideoTimeline>` from
 * `@molecule/app-feature-video-timeline-solid` — the scrubber shows
 * preview thumbnails and frame-precision controls; the timeline shows
 * multi-track structure.
 *
 * Exports `<VideoScrubber>`, the `Thumbnail` and `VideoScrubberProps`
 * types, the default constants, and the pure helpers `timeToFrame`,
 * `frameToTime`, `snapTimeToFrame`, `computeFilmstripTicks`,
 * `selectClosestThumbnail`, and `formatFrameNumber`.
 *
 * @example
 * ```tsx
 * import { createSignal } from 'solid-js'
 * import { VideoScrubber } from '@molecule/app-feature-video-scrubber-solid'
 *
 * export function Editor() {
 *   const [currentTime, setCurrentTime] = createSignal(3.2)
 *   return (
 *     <VideoScrubber
 *       duration={60}
 *       currentTime={currentTime()}
 *       fps={24}
 *       thumbnails={[
 *         { time: 0, src: 'data:image/png;base64,...' },
 *         { time: 5, src: 'data:image/png;base64,...' },
 *         { time: 10, src: 'data:image/png;base64,...' },
 *       ]}
 *       onSeek={(t) => setCurrentTime(t)}
 *     />
 *   )
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
export * from './VideoScrubber.jsx'
