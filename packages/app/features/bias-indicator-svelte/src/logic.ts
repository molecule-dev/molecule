/**
 * The package's plain functions: the bias/reliability classification helpers
 * behind the Svelte `BiasIndicator`. Framework-neutral, so they are the very
 * same functions `@molecule/app-bias-indicator-react` exports.
 *
 * @module
 */

import type { BiasBucket, ReliabilityTier } from './types.js'

/**
 * Clamp a number into the inclusive `[min, max]` range.
 *
 * @param value - Value to clamp.
 * @param min - Lower bound.
 * @param max - Upper bound.
 * @returns The clamped value.
 */
export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  if (value < min) return min
  if (value > max) return max
  return value
}

/**
 * Map a `-1..1` bias scalar into a coarse five-bucket label used for
 * accessibility and colouring. Boundaries: `<= -0.6` far-left,
 * `<= -0.2` left, `< 0.2` center, `< 0.6` right, otherwise far-right.
 *
 * @param bias - Bias scalar (clamped to `[-1, 1]` first).
 * @returns The bias bucket.
 */
export function biasToBucket(bias: number): BiasBucket {
  const b = clamp(bias, -1, 1)
  if (b <= -0.6) return 'far-left'
  if (b <= -0.2) return 'left'
  if (b < 0.2) return 'center'
  if (b < 0.6) return 'right'
  return 'far-right'
}

/**
 * Map a `0..1` reliability score into a four-tier label. Boundaries:
 * `>= 0.75` high, `>= 0.5` medium, `>= 0.25` low, otherwise disputed.
 *
 * @param reliability - Reliability scalar (clamped to `[0, 1]` first).
 * @returns The reliability tier.
 */
export function reliabilityToTier(reliability: number): ReliabilityTier {
  const r = clamp(reliability, 0, 1)
  if (r >= 0.75) return 'high'
  if (r >= 0.5) return 'medium'
  if (r >= 0.25) return 'low'
  return 'disputed'
}

/**
 * Convert a `-1..1` bias value into a `0..100` percent offset for
 * absolute positioning along the scale track.
 *
 * @param bias - Bias scalar (clamped to `[-1, 1]` first).
 * @returns The percent offset from the left edge of the track.
 */
export function biasToPercent(bias: number): number {
  return ((clamp(bias, -1, 1) + 1) / 2) * 100
}

/**
 * Resolve the marker colour for a given bias bucket. Uses semantic CSS
 * custom properties so swapping themes / styling libraries does not
 * require touching this component.
 *
 * @param bucket - Bias bucket.
 * @returns A `var(--…)` CSS color string.
 */
export function bucketColor(bucket: BiasBucket): string {
  switch (bucket) {
    case 'far-left':
      return 'var(--color-info, #2563eb)'
    case 'left':
      return 'var(--color-info-light, #60a5fa)'
    case 'center':
      return 'var(--color-foreground-secondary, #6b7280)'
    case 'right':
      return 'var(--color-warning-light, #fbbf24)'
    case 'far-right':
      return 'var(--color-error, #dc2626)'
  }
}

/**
 * Resolve the dot colour for a given reliability tier.
 *
 * @param tier - Reliability tier.
 * @returns A `var(--…)` CSS color string.
 */
export function tierColor(tier: ReliabilityTier): string {
  switch (tier) {
    case 'high':
      return 'var(--color-success, #16a34a)'
    case 'medium':
      return 'var(--color-info, #2563eb)'
    case 'low':
      return 'var(--color-warning, #d97706)'
    case 'disputed':
      return 'var(--color-error, #dc2626)'
  }
}
