import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import { useCallback, useMemo, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * One pre-computed thumbnail at a given time. The scrubber renders a
 * filmstrip row of thumbnails by picking, for each visible tick, the
 * provided thumbnail whose `time` is closest. Hosts can supply as few
 * or as many thumbnails as they like; gaps are filled by repeating the
 * nearest neighbour.
 */
export interface Thumbnail {
  /** Time of this thumbnail in seconds. */
  time: number
  /** Image source URL (data: URL or fetched blob URL). */
  src: string
}

/**
 * Props for `<VideoScrubber>`. Frame-accurate scrubber widget pairing a
 * thumbnail filmstrip with a click-to-seek playhead, frame-step keyboard
 * controls, and an optional frame-number readout.
 */
export interface VideoScrubberProps {
  /** Total media duration in seconds. */
  duration: number
  /** Current playhead time in seconds. */
  currentTime: number
  /** Frames-per-second used for snapping + frame-step keyboard. Defaults to 24. */
  fps?: number
  /** Pre-computed thumbnails. The scrubber picks the closest one per filmstrip tick. */
  thumbnails?: Thumbnail[]
  /** Called with the seek time (snapped to the nearest frame). */
  onSeek?: (time: number) => void
  /** Whether to show the frame-number readout. Defaults to `true`. */
  showFrameNumber?: boolean
  /** Number of filmstrip cells to render. Defaults to 12. */
  thumbnailCount?: number
  /** Filmstrip cell height in px. Defaults to 48. */
  thumbnailHeight?: number
  /** Optional id for the root element (useful for label associations). */
  id?: string
  /** Extra classes merged onto the root element. */
  className?: string
}

/** Default frame rate (24fps — feature-film standard). */
export const DEFAULT_FPS = 24
/** Default number of filmstrip cells. */
export const DEFAULT_THUMBNAIL_COUNT = 12
/** Default filmstrip cell height in px. */
export const DEFAULT_THUMBNAIL_HEIGHT = 48

/**
 * Convert a continuous time in seconds to a frame index, given a frame
 * rate. The result is rounded to the nearest integer (i.e. snapped to
 * the closest frame boundary).
 *
 * @param time - Time in seconds.
 * @param fps - Frame rate. Must be > 0.
 * @returns Integer frame index (>= 0).
 */
export function timeToFrame(time: number, fps: number): number {
  if (!Number.isFinite(time) || time <= 0) return 0
  if (!Number.isFinite(fps) || fps <= 0) return 0
  return Math.round(time * fps)
}

/**
 * Convert a frame index back to a time in seconds.
 *
 * @param frame - Frame index (any integer >= 0).
 * @param fps - Frame rate. Must be > 0.
 * @returns Time in seconds.
 */
export function frameToTime(frame: number, fps: number): number {
  if (!Number.isFinite(frame) || frame <= 0) return 0
  if (!Number.isFinite(fps) || fps <= 0) return 0
  return frame / fps
}

/**
 * Snap a continuous time value to the nearest frame boundary, then
 * clamp into `[0, duration]`. This is what the scrubber emits via
 * `onSeek` for click-anywhere scrubbing.
 *
 * @param time - Candidate time in seconds.
 * @param fps - Frame rate. Must be > 0.
 * @param duration - Maximum time in seconds (clamp upper bound).
 * @returns Frame-snapped, clamped time in seconds.
 */
export function snapTimeToFrame(time: number, fps: number, duration: number): number {
  if (!Number.isFinite(time) || time < 0) return 0
  const safeDur = Number.isFinite(duration) && duration > 0 ? duration : 0
  if (time > safeDur) return frameToTime(timeToFrame(safeDur, fps), fps)
  return frameToTime(timeToFrame(time, fps), fps)
}

/**
 * Compute evenly-spaced filmstrip ticks across `[0, duration]`. Each
 * tick has a `time` (in seconds) and a `position` (0..1) for layout
 * via `left: position * 100%`. The first tick is at time 0; the last
 * tick is at time `duration` (or 0 if `duration <= 0`).
 *
 * @param duration - Total duration in seconds.
 * @param count - Number of ticks. Coerced into `[1, 1000]`.
 * @returns Array of `{ time, position }` ticks (length === clamped count).
 */
export function computeFilmstripTicks(
  duration: number,
  count: number,
): { time: number; position: number }[] {
  const safeCount = Math.max(1, Math.min(1000, Math.round(Number.isFinite(count) ? count : 1)))
  const safeDur = Number.isFinite(duration) && duration > 0 ? duration : 0
  const ticks: { time: number; position: number }[] = []
  if (safeCount === 1) {
    return [{ time: 0, position: 0 }]
  }
  for (let i = 0; i < safeCount; i++) {
    const position = i / (safeCount - 1)
    ticks.push({ time: position * safeDur, position })
  }
  return ticks
}

/**
 * Pick the thumbnail whose `time` is closest to a target time. Ties
 * break toward the earlier thumbnail. Returns `undefined` only when
 * the input list is empty.
 *
 * @param thumbnails - Available thumbnails (any order).
 * @param targetTime - The target time in seconds.
 * @returns The closest thumbnail, or `undefined` if `thumbnails` is empty.
 */
export function selectClosestThumbnail(
  thumbnails: Thumbnail[],
  targetTime: number,
): Thumbnail | undefined {
  if (!thumbnails || thumbnails.length === 0) return undefined
  let best = thumbnails[0]
  let bestDelta = Math.abs(best.time - targetTime)
  for (let i = 1; i < thumbnails.length; i++) {
    const t = thumbnails[i]
    const delta = Math.abs(t.time - targetTime)
    if (delta < bestDelta) {
      best = t
      bestDelta = delta
    }
  }
  return best
}

/**
 * Format a frame index for the readout display — fixed-width-friendly
 * with a leading hash for clarity.
 *
 * @param frame - Frame index.
 * @returns The display string (e.g. `#42`).
 */
export function formatFrameNumber(frame: number): string {
  return `#${Math.max(0, Math.round(frame))}`
}

/**
 * Frame-accurate video scrubber. Renders an evenly-spaced filmstrip of
 * thumbnail images, a vertical playhead, and an optional frame-number
 * readout. Click anywhere on the strip to seek (snapped to the nearest
 * frame); use `←/→` arrows to step ±1 frame, or `Shift+←/→` to step
 * ±1 second. All `onSeek` calls receive frame-snapped times.
 *
 * Composes well with `<VideoTimeline>` from
 * `@molecule/app-feature-video-timeline-react` — the scrubber shows
 * preview thumbnails and frame-precision controls; the timeline shows
 * multi-track structure.
 *
 * @param props - Component props.
 * @returns The scrubber element.
 */
export function VideoScrubber(props: VideoScrubberProps) {
  const {
    duration,
    currentTime,
    fps = DEFAULT_FPS,
    thumbnails,
    onSeek,
    showFrameNumber = true,
    thumbnailCount = DEFAULT_THUMBNAIL_COUNT,
    thumbnailHeight = DEFAULT_THUMBNAIL_HEIGHT,
    id,
    className,
  } = props

  const cm = getClassMap()
  const { t } = useTranslation()

  const safeFps = Number.isFinite(fps) && fps > 0 ? fps : DEFAULT_FPS
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0
  const safeTime = Number.isFinite(currentTime) && currentTime > 0 ? currentTime : 0
  const clampedTime = safeTime > safeDuration ? safeDuration : safeTime
  const currentFrame = timeToFrame(clampedTime, safeFps)
  const totalFrames = timeToFrame(safeDuration, safeFps)

  const stripBodyRef = useRef<HTMLDivElement | null>(null)
  const seekDragRef = useRef<{ pointerId: number } | null>(null)
  const [, forceRerender] = useState(0)
  const bumpTick = useCallback(() => forceRerender((n) => n + 1), [])

  const ticks = useMemo(
    () => computeFilmstripTicks(safeDuration, thumbnailCount),
    [safeDuration, thumbnailCount],
  )

  const playheadPosition = safeDuration > 0 ? clampedTime / safeDuration : 0

  // Translation strings — companion locale bond
  // (`@molecule/app-locales-feature-video-scrubber`) overrides
  // these; the inline default values are the English fallbacks.
  const rootLabel = t('videoScrubber.aria.root', {}, { defaultValue: 'Video scrubber' })
  const stripLabel = t(
    'videoScrubber.aria.strip',
    { time: clampedTime.toFixed(2), frame: currentFrame },
    { defaultValue: 'Filmstrip — playhead at {{time}}s (frame {{frame}})' },
  )
  const playheadLabel = t(
    'videoScrubber.aria.playhead',
    { time: clampedTime.toFixed(2) },
    { defaultValue: 'Playhead at {{time}}s' },
  )
  const frameReadoutLabel = t(
    'videoScrubber.aria.frameReadout',
    { frame: currentFrame, total: totalFrames },
    { defaultValue: 'Frame {{frame}} of {{total}}' },
  )
  const thumbnailAlt = t('videoScrubber.aria.thumbnail', {}, { defaultValue: 'Frame preview' })
  const noThumbnailsLabel = t('videoScrubber.thumbnails.empty', {}, { defaultValue: 'No preview' })

  /**
   * Convert a pointer's clientX (relative to the strip body) to a time
   * in seconds, snapped to the nearest frame and clamped into
   * `[0, duration]`.
   *
   * @param clientX - Pointer clientX in viewport coordinates.
   * @returns The seek time in seconds.
   */
  function clientXToTime(clientX: number): number {
    const el = stripBodyRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0) return 0
    const ratio = (clientX - rect.left) / rect.width
    const clampedRatio = ratio < 0 ? 0 : ratio > 1 ? 1 : ratio
    const time = clampedRatio * safeDuration
    return snapTimeToFrame(time, safeFps, safeDuration)
  }

  /**
   * Begin a click-to-seek drag on the strip body.
   *
   * @param event - React pointer event from the strip body.
   */
  function onStripPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== undefined && event.button !== 0) return
    if (!onSeek) return
    seekDragRef.current = { pointerId: event.pointerId }
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // jsdom + some older browsers may throw — ignore.
    }
    onSeek(clientXToTime(event.clientX))
    bumpTick()
  }

  /**
   * Continue a strip-body drag (scrub).
   *
   * @param event - React pointer event from the strip body.
   */
  function onStripPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = seekDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    onSeek?.(clientXToTime(event.clientX))
  }

  /**
   * Finish a strip-body drag.
   *
   * @param event - React pointer event from the strip body.
   */
  function onStripPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = seekDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    seekDragRef.current = null
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // ignore
    }
  }

  /**
   * Handle keyboard scrubbing. ←/→ step ±1 frame; Shift+←/→ step
   * ±1 second. Home/End jump to start/end. PageUp/PageDown step ±10
   * frames. Always emits a frame-snapped, clamped time via `onSeek`.
   *
   * @param event - React keyboard event.
   */
  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!onSeek) return
    const { key, shiftKey } = event
    let next: number | null = null
    if (key === 'ArrowLeft') {
      next = shiftKey ? clampedTime - 1 : frameToTime(currentFrame - 1, safeFps)
    } else if (key === 'ArrowRight') {
      next = shiftKey ? clampedTime + 1 : frameToTime(currentFrame + 1, safeFps)
    } else if (key === 'PageUp') {
      next = frameToTime(currentFrame - 10, safeFps)
    } else if (key === 'PageDown') {
      next = frameToTime(currentFrame + 10, safeFps)
    } else if (key === 'Home') {
      next = 0
    } else if (key === 'End') {
      next = safeDuration
    }
    if (next === null) return
    event.preventDefault()
    onSeek(snapTimeToFrame(next, safeFps, safeDuration))
  }

  // Inline styles for things ClassMap can't express (sizing, absolute
  // positioning, percentage-based offsets).
  const rootStyle: CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
  }
  const stripBodyStyle: CSSProperties = {
    position: 'relative',
    display: 'flex',
    width: '100%',
    height: thumbnailHeight,
    overflow: 'hidden',
    cursor: onSeek ? 'pointer' : 'default',
    touchAction: 'none',
    userSelect: 'none',
  }
  const cellStyle = (cell: { time: number; position: number }): CSSProperties => ({
    flex: '1 1 0',
    minWidth: 0,
    height: '100%',
    backgroundImage: cellThumbnail(cell.time) ? `url("${cellThumbnail(cell.time)}")` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundColor: 'var(--mol-video-scrubber-cell-bg, rgba(127, 127, 127, 0.15))',
    borderRight: 'var(--mol-video-scrubber-cell-divider, 1px solid rgba(0, 0, 0, 0.08))',
  })
  const playheadStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    left: `${playheadPosition * 100}%`,
    transform: 'translateX(-1px)',
    background: 'var(--mol-video-scrubber-playhead, #ff3b30)',
    pointerEvents: 'none',
    zIndex: 2,
  }
  const frameReadoutStyle: CSSProperties = {
    fontVariantNumeric: 'tabular-nums',
  }

  /**
   * Pick the closest thumbnail's src for a tick time, or empty string
   * when no thumbnails are available.
   *
   * @param time - Tick time in seconds.
   * @returns The thumbnail src or empty string.
   */
  function cellThumbnail(time: number): string {
    if (!thumbnails || thumbnails.length === 0) return ''
    return selectClosestThumbnail(thumbnails, time)?.src ?? ''
  }

  return (
    <div
      id={id}
      role="group"
      aria-label={rootLabel}
      data-mol-id="video-scrubber"
      data-fps={safeFps}
      data-frame={currentFrame}
      className={cm.cn(className)}
      style={rootStyle}
    >
      <div
        ref={stripBodyRef}
        role="slider"
        tabIndex={0}
        aria-label={stripLabel}
        aria-valuemin={0}
        aria-valuemax={safeDuration}
        aria-valuenow={clampedTime}
        data-mol-id="video-scrubber-strip"
        style={stripBodyStyle}
        onPointerDown={onStripPointerDown}
        onPointerMove={onStripPointerMove}
        onPointerUp={onStripPointerUp}
        onPointerCancel={onStripPointerUp}
        onKeyDown={onKeyDown}
      >
        {ticks.map((tk, i) => {
          const src = cellThumbnail(tk.time)
          return (
            <div
              key={`cell-${i}`}
              data-mol-id="video-scrubber-cell"
              data-time={tk.time}
              data-index={i}
              role="img"
              aria-label={src ? thumbnailAlt : noThumbnailsLabel}
              style={cellStyle(tk)}
            />
          )
        })}
        <div
          data-mol-id="video-scrubber-playhead"
          aria-label={playheadLabel}
          style={playheadStyle}
        />
      </div>
      {showFrameNumber ? (
        <div
          data-mol-id="video-scrubber-frame-readout"
          aria-label={frameReadoutLabel}
          className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('p', 1))}
          style={frameReadoutStyle}
        >
          <span data-mol-id="video-scrubber-frame-current">{formatFrameNumber(currentFrame)}</span>
          <span data-mol-id="video-scrubber-frame-total">
            {t(
              'videoScrubber.frameReadout.total',
              { total: totalFrames },
              { defaultValue: '/ {{total}} frames' },
            )}
          </span>
        </div>
      ) : null}
    </div>
  )
}
