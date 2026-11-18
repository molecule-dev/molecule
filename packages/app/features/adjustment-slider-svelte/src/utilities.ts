/**
 * Pure helpers for the AdjustmentSlider component.
 *
 * @module
 */

import type { AdjustmentSliderFormatter } from './types.js'

/**
 * Clamp a numeric value to the inclusive `[min, max]` range, snapping to the
 * nearest multiple of `step` measured from `min`. Does not assume `min === 0`
 * (so bipolar `[-100, 100]` works correctly with non-integer steps).
 *
 * @param value - The raw value to normalise.
 * @param min - Inclusive lower bound.
 * @param max - Inclusive upper bound.
 * @param step - Step increment (must be > 0).
 * @returns The clamped + step-snapped value.
 */
export function clampStep(value: number, min: number, max: number, step: number): number {
  if (!Number.isFinite(value)) return min
  const clamped = Math.min(Math.max(value, min), max)
  if (!(step > 0)) return clamped
  const snapped = min + Math.round((clamped - min) / step) * step
  // Re-clamp in case rounding pushed us across max.
  const reclamped = Math.min(Math.max(snapped, min), max)
  // Trim float drift so e.g. step=0.1 doesn't surface 0.30000000000000004.
  const decimals = decimalsForStep(step)
  return Number(reclamped.toFixed(decimals))
}

/**
 * Compute the value the slider should reset to when double-clicked.
 *
 * @param min - Inclusive lower bound.
 * @param bipolar - Whether the slider is in bipolar (zero-center) mode.
 * @returns `0` for bipolar sliders, `min` otherwise.
 */
export function defaultResetValue(min: number, bipolar: boolean): number {
  return bipolar ? 0 : min
}

/**
 * Build the default value formatter — appends an optional unit suffix.
 *
 * @param unit - Optional unit string (e.g. `'%'`).
 * @returns A formatter producing `"<value><unit>"`.
 */
export function defaultFormatter(unit?: string): AdjustmentSliderFormatter {
  const suffix = unit ?? ''
  return (n: number) => `${n}${suffix}`
}

/**
 * Compute the keyboard nudge step for arrow keys.
 *
 * Plain arrow → `step`. Shift-modifier → `step * 10` so users can move in
 * coarser increments. Always at least `step`.
 *
 * @param step - The base step increment.
 * @param shift - Whether the Shift modifier is held.
 * @returns The effective per-keypress delta.
 */
export function keyboardNudge(step: number, shift: boolean): number {
  return shift ? step * 10 : step
}

/**
 * Number of decimal places implied by the step value (for fixed-format
 * snapping).
 *
 * @param step - Step increment.
 * @returns Decimal-place count to round to.
 */
function decimalsForStep(step: number): number {
  if (!Number.isFinite(step) || step <= 0) return 0
  const s = String(step)
  const dot = s.indexOf('.')
  if (dot === -1) return 0
  return Math.min(s.length - dot - 1, 12)
}
