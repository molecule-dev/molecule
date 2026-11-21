/**
 * Types of the Vue video timeline — the same props (React names) and the same
 * DOM for the same input as `@molecule/app-feature-video-timeline-react`.
 *
 * @module
 */

import type { Clip } from '@molecule/app-feature-track-lane-vue'

/**
 * The kind of media a track holds. Drives the lane name fallback,
 * the default clip color, and the data attribute parents can hook
 * onto for kind-specific styling.
 */
export type TrackKind = 'video' | 'audio' | 'subtitle'

/**
 * One track row on a `<VideoTimeline>`. Tracks are rendered in array
 * order top-to-bottom and each track delegates clip rendering to a
 * `<TrackLane>` row.
 */
export interface Track {
  /** Stable identifier — used as the row key and lane id passed to handlers. */
  id: string
  /** The kind of media on this track. */
  kind: TrackKind
  /** Clips on this track. Order is preserved as-is. */
  clips: Clip[]
  /** Optional human-friendly track name; falls back to a translated kind label. */
  name?: string
}

/**
 * Edit mode applied to clip drags.
 *
 * - `insert` — dragging a clip just drops it at the new position; other clips
 *   on the lane stay where they are.
 * - `ripple` — dragging a clip shifts every later clip on the same lane by
 *   the same delta, preserving inter-clip gaps.
 */
export type VideoTimelineMode = 'ripple' | 'insert'

/** Props accepted by the {@link VideoTimeline} component — the same props React's accepts. */
export interface VideoTimelineProps {
  /** Tracks to render. Order is preserved as-is. */
  tracks: Track[]
  /** Current playhead time in seconds. Drives the playhead vertical line. */
  currentTime: number
  /** Total timeline duration in seconds — used to size the scrollable body. */
  duration: number
  /** Called when the user clicks/scrubs the ruler. */
  onSeek?: (time: number) => void
  /** Called when a clip on a lane is dragged horizontally. */
  onClipMove?: (clipId: string, startTime: number, trackId: string) => void
  /** Called when a clip's right-edge resize handle is dragged. */
  onClipResize?: (clipId: string, duration: number, trackId: string) => void
  /** Horizontal scale (px per second). Defaults to 20. */
  pixelsPerSecond?: number
  /** Lower zoom bound for Ctrl+wheel / slider. Defaults to 2. */
  zoomMin?: number
  /** Upper zoom bound for Ctrl+wheel / slider. Defaults to 200. */
  zoomMax?: number
  /** Edit mode for clip drags. Defaults to `'ripple'`. */
  mode?: VideoTimelineMode
  /** Called when the user changes the zoom (slider or Ctrl+wheel). */
  onZoomChange?: (pixelsPerSecond: number) => void
  /** Optional currently-selected clip id. */
  selectedClipId?: string
  /** Called when a clip is clicked (no drag). */
  onClipClick?: (clipId: string, trackId: string) => void
  /** Per-track row height in pixels. Defaults to 44. */
  trackHeight?: number
  /** Width of the leading lane-header column in pixels. Defaults to 120. */
  laneHeaderWidth?: number
  /** Height of the time ruler row in pixels. Defaults to 28. */
  rulerHeight?: number
  /** Extra classes merged onto the root element. */
  className?: string
}
