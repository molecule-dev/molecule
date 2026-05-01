/**
 * Multi-track video timeline composing one `<TrackLane>` per track row
 * with a shared time ruler, playhead, zoom slider + Ctrl+wheel zoom,
 * and ripple/insert edit modes.
 *
 * Exports `<VideoTimeline>`, the `Track` and `VideoTimelineMode` types,
 * and the pure-function helpers `clampZoom`, `zoomFromWheelDelta`,
 * `computeRulerTicks`, `computeRippleUpdates`, and `formatTickTime`
 * that back the zoom math, ruler tick generation, and ripple-mode
 * fan-out.
 *
 * @example
 * ```tsx
 * import { VideoTimeline } from '@molecule/app-feature-video-timeline-react'
 *
 * <VideoTimeline
 *   tracks={[
 *     { id: 'v1', kind: 'video', clips: [{ id: 'a', startTime: 0, duration: 5, label: 'Intro' }] },
 *     { id: 'a1', kind: 'audio', clips: [{ id: 'b', startTime: 0, duration: 12 }] },
 *   ]}
 *   currentTime={3.2}
 *   duration={60}
 *   pixelsPerSecond={20}
 *   mode="ripple"
 *   onSeek={(t) => setCurrentTime(t)}
 *   onClipMove={(id, startTime, trackId) => updateClip(trackId, id, { startTime })}
 *   onClipResize={(id, duration, trackId) => updateClip(trackId, id, { duration })}
 *   onZoomChange={(pps) => setZoom(pps)}
 * />
 * ```
 *
 * @remarks
 * Ripple mode (default) shifts all later clips on the same lane by the
 * same delta when a clip is dragged, preserving inter-clip gaps. Switch
 * to `mode="insert"` to drop the dragged clip at its new position
 * without disturbing the rest of the lane.
 *
 * @module
 */

export * from './VideoTimeline.js'
