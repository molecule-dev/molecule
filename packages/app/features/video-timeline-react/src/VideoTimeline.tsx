import type {
  CSSProperties,
  JSX,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from 'react'
import { useCallback, useMemo, useRef, useState } from 'react'

import type { Clip } from '@molecule/app-feature-track-lane-react'
import { clipToPixels, pixelsToTime, TrackLane } from '@molecule/app-feature-track-lane-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

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
  /** Stable identifier — used as the React key and lane id passed to handlers. */
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

/** Props for `<VideoTimeline>`. */
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

/** Default horizontal scale. */
export const DEFAULT_PIXELS_PER_SECOND = 20
/** Default lower zoom bound. */
export const DEFAULT_ZOOM_MIN = 2
/** Default upper zoom bound. */
export const DEFAULT_ZOOM_MAX = 200
/** Default per-track row height. */
export const DEFAULT_TRACK_HEIGHT = 44
/** Default lane-header column width. */
export const DEFAULT_LANE_HEADER_WIDTH = 120
/** Default ruler height. */
export const DEFAULT_RULER_HEIGHT = 28
/** Multiplier per Ctrl+wheel notch (positive deltaY zooms out). */
export const ZOOM_WHEEL_FACTOR = 1.1

/**
 * Clamp a candidate `pixelsPerSecond` value into `[min, max]`. Used by
 * the zoom slider, Ctrl+wheel, and any external zoom button that calls
 * `onZoomChange`.
 *
 * @param value - Candidate horizontal scale in px/sec.
 * @param min - Lower bound (inclusive).
 * @param max - Upper bound (inclusive).
 * @returns The clamped value.
 */
export function clampZoom(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  if (value < min) return min
  if (value > max) return max
  return value
}

/**
 * Compute the next zoom value for a Ctrl+wheel notch. Negative `deltaY`
 * (scroll-up) zooms in; positive zooms out. Result is clamped into
 * `[min, max]`.
 *
 * @param current - Current `pixelsPerSecond`.
 * @param deltaY - Wheel `deltaY` (sign-only — magnitude is ignored).
 * @param min - Lower zoom bound.
 * @param max - Upper zoom bound.
 * @returns The clamped next zoom value.
 */
export function zoomFromWheelDelta(
  current: number,
  deltaY: number,
  min: number,
  max: number,
): number {
  if (deltaY === 0) return clampZoom(current, min, max)
  const factor = deltaY < 0 ? ZOOM_WHEEL_FACTOR : 1 / ZOOM_WHEEL_FACTOR
  return clampZoom(current * factor, min, max)
}

/**
 * Compute time tick marks for the ruler. Picks an interval (1, 2, 5, 10,
 * 30, or 60 seconds, etc.) so that adjacent ticks are at least
 * `MIN_TICK_PIXEL_SPACING` apart on screen. Always emits a tick at 0 and
 * stops at the last tick `<= duration`.
 *
 * @param duration - Total duration in seconds.
 * @param pixelsPerSecond - Horizontal scale.
 * @returns Tick descriptors with `{ time, pixel }`.
 */
export function computeRulerTicks(
  duration: number,
  pixelsPerSecond: number,
): { time: number; pixel: number }[] {
  if (duration <= 0 || pixelsPerSecond <= 0) return [{ time: 0, pixel: 0 }]
  const targetPx = MIN_TICK_PIXEL_SPACING
  const minSecondsBetween = targetPx / pixelsPerSecond
  // 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1800, 3600
  const candidates = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1800, 3600]
  let interval = candidates[candidates.length - 1]
  for (const c of candidates) {
    if (c >= minSecondsBetween) {
      interval = c
      break
    }
  }
  const ticks: { time: number; pixel: number }[] = []
  // Use integer step counter to avoid floating-point drift.
  let step = 0
  while (true) {
    const time = step * interval
    if (time > duration + 1e-9) break
    ticks.push({ time, pixel: time * pixelsPerSecond })
    step += 1
    if (step > 10000) break // hard safety cap
  }
  return ticks
}

/** Minimum spacing (px) between adjacent ruler ticks. */
export const MIN_TICK_PIXEL_SPACING = 60

/**
 * Compute the ripple-mode update for a clip drag on a single lane.
 * Returns one update per affected clip — at minimum the dragged clip,
 * plus every clip whose original `startTime` is strictly greater (which
 * shifts by the same `delta`).
 *
 * Negative deltas are clamped so no clip's `startTime` goes below 0
 * (the dragged clip is the limiting factor — later clips can never
 * cross zero before it does, since they all started later).
 *
 * @param clips - All clips on the lane (any order).
 * @param draggedClipId - The id of the clip being dragged.
 * @param proposedStartTime - The candidate new `startTime` for the dragged clip.
 * @returns Array of `{ id, startTime }` updates to apply.
 */
export function computeRippleUpdates(
  clips: Clip[],
  draggedClipId: string,
  proposedStartTime: number,
): { id: string; startTime: number }[] {
  const dragged = clips.find((c) => c.id === draggedClipId)
  if (!dragged) return []
  const clamped = proposedStartTime < 0 ? 0 : proposedStartTime
  const delta = clamped - dragged.startTime
  if (delta === 0) {
    return [{ id: dragged.id, startTime: clamped }]
  }
  const updates: { id: string; startTime: number }[] = [{ id: dragged.id, startTime: clamped }]
  for (const c of clips) {
    if (c.id === dragged.id) continue
    if (c.startTime > dragged.startTime) {
      const next = c.startTime + delta
      updates.push({ id: c.id, startTime: next < 0 ? 0 : next })
    }
  }
  return updates
}

interface SeekDragState {
  pointerId: number
}

/**
 * Multi-track video timeline. Composes one `<TrackLane>` per track with
 * a shared time ruler at the top, a vertical playhead, and a zoom slider
 * row. Pointer-down on the ruler scrubs `onSeek`; Ctrl+wheel anywhere
 * over the body changes zoom; the slider is keyboard-accessible.
 *
 * In `'ripple'` mode (default), dragging a clip on a lane shifts every
 * subsequent clip on that lane by the same delta — `onClipMove` is
 * called once per affected clip. In `'insert'` mode, only the dragged
 * clip moves.
 *
 * @param props - Component props.
 * @returns The multi-track timeline element.
 */
export function VideoTimeline(props: VideoTimelineProps): JSX.Element {
  const {
    tracks,
    currentTime,
    duration,
    onSeek,
    onClipMove,
    onClipResize,
    pixelsPerSecond = DEFAULT_PIXELS_PER_SECOND,
    zoomMin = DEFAULT_ZOOM_MIN,
    zoomMax = DEFAULT_ZOOM_MAX,
    mode = 'ripple',
    onZoomChange,
    selectedClipId,
    onClipClick,
    trackHeight = DEFAULT_TRACK_HEIGHT,
    laneHeaderWidth = DEFAULT_LANE_HEADER_WIDTH,
    rulerHeight = DEFAULT_RULER_HEIGHT,
    className,
  } = props

  const cm = getClassMap()
  const { t } = useTranslation()

  const seekDragRef = useRef<SeekDragState | null>(null)
  const rulerBodyRef = useRef<HTMLDivElement | null>(null)
  const [, forceRerender] = useState(0)
  const bumpTick = useCallback(() => forceRerender((n) => n + 1), [])

  const safeDuration = duration > 0 ? duration : 0
  const safeScale = pixelsPerSecond > 0 ? pixelsPerSecond : 1
  const bodyWidth = Math.max(0, safeDuration * safeScale)

  const ticks = useMemo(() => computeRulerTicks(safeDuration, safeScale), [safeDuration, safeScale])

  const rulerLabel = t('videoTimeline.aria.ruler', {}, { defaultValue: 'Time ruler' })
  const playheadLabel = t(
    'videoTimeline.aria.playhead',
    { time: currentTime.toFixed(2) },
    { defaultValue: 'Playhead at {{time}}s' },
  )
  const zoomLabel = t('videoTimeline.aria.zoom', {}, { defaultValue: 'Timeline zoom' })
  const zoomInLabel = t('videoTimeline.zoom.in', {}, { defaultValue: 'Zoom in' })
  const zoomOutLabel = t('videoTimeline.zoom.out', {}, { defaultValue: 'Zoom out' })
  const modeLabel = t('videoTimeline.aria.mode', {}, { defaultValue: 'Edit mode' })
  const rootLabel = t('videoTimeline.aria.root', {}, { defaultValue: 'Video timeline' })

  const trackKindLabel = (kind: TrackKind, fallback: string): string =>
    t(`videoTimeline.trackKind.${kind}`, {}, { defaultValue: fallback })

  /**
   * Convert a pointer's clientX (relative to the ruler body) to a time
   * value, clamped into `[0, duration]`.
   *
   * @param clientX - Pointer clientX in viewport coordinates.
   * @returns The seek time in seconds.
   */
  function clientXToTime(clientX: number): number {
    const el = rulerBodyRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const px = clientX - rect.left
    const time = pixelsToTime(px, safeScale)
    if (time < 0) return 0
    if (time > safeDuration) return safeDuration
    return time
  }

  /**
   * Begin a ruler scrub. Subsequent pointermove events while the pointer
   * is captured will continue to fire `onSeek`.
   *
   * @param event - React pointer event from the ruler body.
   */
  function onRulerPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    if (event.button !== undefined && event.button !== 0) return
    if (!onSeek) return
    seekDragRef.current = { pointerId: event.pointerId }
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch (_error) {
      // jsdom doesn't always implement setPointerCapture; ignore.
    }
    onSeek(clientXToTime(event.clientX))
    bumpTick()
  }

  /**
   * Continue a ruler scrub.
   *
   * @param event - React pointer event from the ruler body.
   */
  function onRulerPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    const drag = seekDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    onSeek?.(clientXToTime(event.clientX))
  }

  /**
   * Finish a ruler scrub.
   *
   * @param event - React pointer event from the ruler body.
   */
  function onRulerPointerUp(event: ReactPointerEvent<HTMLDivElement>): void {
    const drag = seekDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    seekDragRef.current = null
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch (_error) {
      // releasePointerCapture may throw in jsdom/headless; pointer state already cleared above.
    }
  }

  /**
   * Handle Ctrl+wheel zoom. Plain wheel scrolls the body; Ctrl+wheel
   * (or pinch-zoom on macOS, which surfaces as ctrlKey) zooms.
   *
   * @param event - React wheel event from the body.
   */
  function onBodyWheel(event: ReactWheelEvent<HTMLDivElement>): void {
    if (!event.ctrlKey) return
    if (!onZoomChange) return
    event.preventDefault()
    const next = zoomFromWheelDelta(safeScale, event.deltaY, zoomMin, zoomMax)
    if (next !== safeScale) onZoomChange(next)
  }

  /**
   * Forward a track-lane clip move to `onClipMove`, fanning out via
   * `computeRippleUpdates` when in `'ripple'` mode.
   *
   * @param trackId - The track id forwarded as the lane id.
   * @param clipId - The id of the dragged clip.
   * @param proposedStartTime - The candidate new `startTime`.
   */
  function handleClipMove(trackId: string, clipId: string, proposedStartTime: number): void {
    if (!onClipMove) return
    const track = tracks.find((tr) => tr.id === trackId)
    if (!track) {
      onClipMove(clipId, proposedStartTime, trackId)
      return
    }
    if (mode === 'insert') {
      onClipMove(clipId, proposedStartTime, trackId)
      return
    }
    const updates = computeRippleUpdates(track.clips, clipId, proposedStartTime)
    for (const u of updates) onClipMove(u.id, u.startTime, trackId)
  }

  const playheadPx = clipToPixels({ startTime: currentTime, duration: 0 }, safeScale).left

  // Style objects that ClassMap can't express live inline (sizes,
  // absolute positioning, scroll behavior). Background colors are
  // intentionally token-driven (CSS custom properties) so a host app
  // can theme the timeline via :root vars.
  const rootStyle: CSSProperties = {
    width: '100%',
    overflow: 'hidden',
  }
  const rulerRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'stretch',
    height: rulerHeight,
    minHeight: rulerHeight,
    position: 'relative',
  }
  const rulerHeaderStyle: CSSProperties = {
    width: laneHeaderWidth,
    minWidth: laneHeaderWidth,
    boxSizing: 'border-box',
  }
  const rulerBodyStyle: CSSProperties = {
    flex: '1 1 auto',
    position: 'relative',
    height: rulerHeight,
    minWidth: bodyWidth,
    overflow: 'hidden',
    cursor: onSeek ? 'pointer' : 'default',
    touchAction: 'none',
  }
  const tracksScrollStyle: CSSProperties = {
    position: 'relative',
    overflowX: 'auto',
    overflowY: 'auto',
    width: '100%',
  }
  const tracksInnerStyle: CSSProperties = {
    position: 'relative',
    minWidth: bodyWidth + laneHeaderWidth,
  }
  const playheadStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    left: playheadPx + laneHeaderWidth,
    background: 'var(--mol-video-timeline-playhead, #ff3b30)',
    pointerEvents: 'none',
    zIndex: 2,
  }
  const playheadInRulerStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    left: playheadPx,
    background: 'var(--mol-video-timeline-playhead, #ff3b30)',
    pointerEvents: 'none',
  }

  return (
    <div
      role="group"
      aria-label={rootLabel}
      data-mol-id="video-timeline"
      data-mode={mode}
      className={cm.cn(className)}
      style={rootStyle}
    >
      {/* Zoom + mode controls row */}
      <div
        data-mol-id="video-timeline-controls"
        className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('p', 2))}
      >
        <span data-mol-id="video-timeline-mode" aria-label={modeLabel}>
          {t(
            `videoTimeline.mode.${mode}`,
            {},
            {
              defaultValue: mode === 'ripple' ? 'Ripple' : 'Insert',
            },
          )}
        </span>
        <button
          type="button"
          data-mol-id="video-timeline-zoom-out"
          aria-label={zoomOutLabel}
          className={cm.cn(cm.cursorPointer)}
          onClick={() => onZoomChange?.(clampZoom(safeScale / ZOOM_WHEEL_FACTOR, zoomMin, zoomMax))}
        >
          {t('videoTimeline.zoom.out.icon', {}, { defaultValue: '−' })}
        </button>
        <input
          type="range"
          data-mol-id="video-timeline-zoom-slider"
          aria-label={zoomLabel}
          min={zoomMin}
          max={zoomMax}
          step={1}
          value={Math.round(clampZoom(safeScale, zoomMin, zoomMax))}
          onChange={(e) => onZoomChange?.(clampZoom(Number(e.target.value), zoomMin, zoomMax))}
        />
        <button
          type="button"
          data-mol-id="video-timeline-zoom-in"
          aria-label={zoomInLabel}
          className={cm.cn(cm.cursorPointer)}
          onClick={() => onZoomChange?.(clampZoom(safeScale * ZOOM_WHEEL_FACTOR, zoomMin, zoomMax))}
        >
          {t('videoTimeline.zoom.in.icon', {}, { defaultValue: '+' })}
        </button>
      </div>

      {/* Ruler row */}
      <div data-mol-id="video-timeline-ruler-row" style={rulerRowStyle}>
        <div data-mol-id="video-timeline-ruler-header" style={rulerHeaderStyle} />
        <div
          ref={rulerBodyRef}
          role="slider"
          tabIndex={0}
          aria-label={rulerLabel}
          aria-valuemin={0}
          aria-valuemax={safeDuration}
          aria-valuenow={currentTime}
          data-mol-id="video-timeline-ruler"
          style={rulerBodyStyle}
          onPointerDown={onRulerPointerDown}
          onPointerMove={onRulerPointerMove}
          onPointerUp={onRulerPointerUp}
          onPointerCancel={onRulerPointerUp}
        >
          {ticks.map((tk) => {
            const tickStyle: CSSProperties = {
              position: 'absolute',
              left: tk.pixel,
              top: 0,
              bottom: 0,
              width: 1,
              background: 'var(--mol-video-timeline-tick, rgba(127, 127, 127, 0.5))',
              pointerEvents: 'none',
            }
            const labelStyle: CSSProperties = {
              position: 'absolute',
              left: tk.pixel + 2,
              top: 2,
              fontSize: 10,
              pointerEvents: 'none',
            }
            return (
              <div key={`tick-${tk.time}`}>
                <div data-mol-id="video-timeline-tick" data-time={tk.time} style={tickStyle} />
                <span
                  data-mol-id="video-timeline-tick-label"
                  data-time={tk.time}
                  style={labelStyle}
                >
                  {formatTickTime(tk.time)}
                </span>
              </div>
            )
          })}
          <div
            data-mol-id="video-timeline-playhead-ruler"
            aria-hidden="true"
            style={playheadInRulerStyle}
          />
        </div>
      </div>

      {/* Tracks (scrollable) */}
      <div data-mol-id="video-timeline-tracks" style={tracksScrollStyle} onWheel={onBodyWheel}>
        <div style={tracksInnerStyle}>
          {tracks.map((track) => {
            const fallbackName =
              track.name ?? trackKindLabel(track.kind, defaultKindName(track.kind))
            return (
              <div
                key={track.id}
                data-mol-id="video-timeline-track"
                data-track-id={track.id}
                data-track-kind={track.kind}
              >
                <TrackLane
                  name={fallbackName}
                  clips={track.clips}
                  pixelsPerSecond={safeScale}
                  height={trackHeight}
                  lane={track.id}
                  selectedClipId={selectedClipId}
                  onClipMove={(clipId, startTime) => handleClipMove(track.id, clipId, startTime)}
                  onClipResize={(clipId, dur) => onClipResize?.(clipId, dur, track.id)}
                  onClipClick={(clipId) => onClipClick?.(clipId, track.id)}
                />
              </div>
            )
          })}
          <div
            data-mol-id="video-timeline-playhead"
            aria-label={playheadLabel}
            style={playheadStyle}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Format a tick time for the ruler — `mm:ss` over a minute, `s.s` below.
 *
 * @param seconds - Time in seconds.
 * @returns Formatted string for the tick label.
 */
export function formatTickTime(seconds: number): string {
  if (seconds < 60) {
    return seconds === Math.floor(seconds) ? `${seconds}s` : `${seconds.toFixed(1)}s`
  }
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds - m * 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Default English label for a track kind, used when a host app passes
 * neither a `name` nor a translation override for the kind.
 *
 * @param kind - Track kind.
 * @returns The English fallback label.
 */
function defaultKindName(kind: TrackKind): string {
  if (kind === 'video') return 'Video'
  if (kind === 'audio') return 'Audio'
  return 'Subtitle'
}
