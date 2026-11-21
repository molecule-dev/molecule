/**
 * Range constants and clamp helpers of the Vue channel-strip mixer — the same
 * values and behaviour `@molecule/app-feature-audio-mixer-react` exports.
 *
 * @module
 */

/** Minimum allowed fader level. */
export const MIN_LEVEL = 0
/** Maximum allowed fader level. */
export const MAX_LEVEL = 1
/** Minimum allowed pan position (full left). */
export const MIN_PAN = -1
/** Maximum allowed pan position (full right). */
export const MAX_PAN = 1

/**
 * Clamp a fader/send level into the closed interval `[0, 1]`. Returns
 * `0` for non-finite inputs.
 *
 * @param value - Candidate level.
 * @returns The clamped level.
 */
export function clampLevel(value: number): number {
  if (!Number.isFinite(value)) return MIN_LEVEL
  if (value < MIN_LEVEL) return MIN_LEVEL
  if (value > MAX_LEVEL) return MAX_LEVEL
  return value
}

/**
 * Clamp a pan position into the closed interval `[-1, 1]`. Returns `0`
 * (center) for non-finite inputs.
 *
 * @param value - Candidate pan position.
 * @returns The clamped pan position.
 */
export function clampPan(value: number): number {
  if (!Number.isFinite(value)) return 0
  if (value < MIN_PAN) return MIN_PAN
  if (value > MAX_PAN) return MAX_PAN
  return value
}
