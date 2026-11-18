/**
 * Pure helpers and defaults of the Svelte frame-accurate video scrubber — the
 * same values `@molecule/app-feature-video-scrubber-react` exports.
 *
 * @module
 */

import type { Thumbnail } from './types.js'

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
  let best = thumbnails[0]!
  let bestDelta = Math.abs(best.time - targetTime)
  for (let i = 1; i < thumbnails.length; i++) {
    const t = thumbnails[i]!
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
