/**
 * Pure geometry helpers of the track-lane primitive: the import path, the
 * same constants and the same math `@molecule/app-feature-track-lane-react`
 * exports.
 *
 * @module
 */

/** Minimum clip duration in seconds — clips can't be resized below this. */
export const MIN_CLIP_DURATION_SECONDS = 0.05

/** Pointer-distance threshold (px) before a press becomes a drag. */
export const DRAG_DISTANCE_THRESHOLD_PX = 3

/**
 * Convert a clip to its on-lane pixel geometry.
 *
 * @param clip - The clip to project (`startTime` + `duration` in seconds).
 * @param pixelsPerSecond - Horizontal scale; zero or negative falls back to 1.
 * @returns `{ left, width }` in pixels.
 */
export function clipToPixels(
  clip: { startTime: number; duration: number },
  pixelsPerSecond: number,
): { left: number; width: number } {
  const safeScale = pixelsPerSecond > 0 ? pixelsPerSecond : 1
  return {
    left: clip.startTime * safeScale,
    width: Math.max(1, clip.duration * safeScale),
  }
}

/**
 * Convert a pixel offset back to a time value, clamped to `>= 0`.
 *
 * @param pixels - Offset in pixels.
 * @param pixelsPerSecond - Horizontal scale; zero or negative falls back to 1.
 * @returns Time in seconds (never negative).
 */
export function pixelsToTime(pixels: number, pixelsPerSecond: number): number {
  const safeScale = pixelsPerSecond > 0 ? pixelsPerSecond : 1
  const t = pixels / safeScale
  return t < 0 ? 0 : t
}

/**
 * Clamp the proposed new `startTime` for a clip move so the clip stays
 * non-negative. (No upper bound — the parent decides whether to clip to a song
 * length.)
 *
 * @param proposedStartTime - The candidate start time in seconds.
 * @returns The clamped start time.
 */
export function clampClipMove(proposedStartTime: number): number {
  return proposedStartTime < 0 ? 0 : proposedStartTime
}
