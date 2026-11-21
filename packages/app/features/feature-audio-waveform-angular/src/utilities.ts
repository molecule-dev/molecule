/**
 * Pure helpers of the Angular audio-waveform renderer.
 *
 * @module
 */

/**
 * Clamp a value into the closed interval `[min, max]`. Returns `min`
 * for `NaN` / non-finite inputs.
 *
 * @param value - Value to clamp.
 * @param min - Minimum (inclusive).
 * @param max - Maximum (inclusive).
 * @returns The clamped value.
 */
export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  if (value < min) return min
  if (value > max) return max
  return value
}

/**
 * Compute the seek time (in seconds) for a click at horizontal pixel
 * `x` inside a waveform bounding box of `width` pixels covering an
 * audio of `duration` seconds. Clamps the result into `[0, duration]`.
 *
 * @param x - Horizontal pixel offset of the click inside the bounding box.
 * @param width - Width of the bounding box in pixels.
 * @param duration - Total audio duration in seconds.
 * @returns The seek target time, in seconds.
 */
export function seekTimeFromClick(x: number, width: number, duration: number): number {
  if (!Number.isFinite(width) || width <= 0) return 0
  if (!Number.isFinite(duration) || duration <= 0) return 0
  const ratio = clamp(x / width, 0, 1)
  return ratio * duration
}
