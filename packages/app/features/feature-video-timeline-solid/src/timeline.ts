/**
 * Pure helpers of the video timeline: the same constants and the same math
 * `@molecule/app-feature-video-timeline-react` exports — the zoom clamping,
 * the Ctrl+wheel zoom step, the ruler tick generation, the ripple-mode
 * fan-out and the tick time formatting.
 *
 * @module
 */

import type { Clip } from '@molecule/app-feature-track-lane-solid'

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

/** Minimum spacing (px) between adjacent ruler ticks. */
export const MIN_TICK_PIXEL_SPACING = 60

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
