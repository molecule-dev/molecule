/** Pure helpers for gradebook math + formatting. */

import type { GpaScale, Grade } from './types.js'

/**
 * Compute a percentage `[0, 100]` from a {@link Grade} row. When `maxPoints`
 * is missing or ≤ 0 the score is treated as already being a percentage.
 *
 * @param grade - The grade row.
 * @returns The percentage value clamped to `[0, 100]`.
 */
export function computePercentage(grade: Grade): number {
  const max = typeof grade.maxPoints === 'number' && grade.maxPoints > 0 ? grade.maxPoints : 100
  if (!Number.isFinite(grade.score)) return 0
  const pct = (grade.score / max) * 100
  if (!Number.isFinite(pct)) return 0
  return Math.max(0, Math.min(100, pct))
}

/**
 * Format a numeric GPA for display. Percentages render with no decimals;
 * 4.0 / 5.0 scales render with two decimals.
 *
 * @param value - The GPA / percentage value to format.
 * @param scale - The scale being displayed.
 * @returns A locale-independent string representation.
 */
export function formatGpa(value: number, scale: GpaScale): string {
  if (!Number.isFinite(value)) return scale === 'percentage' ? '0%' : '0.00'
  if (scale === 'percentage') return `${Math.round(value)}%`
  return value.toFixed(2)
}

/**
 * Default ceiling for a given GPA scale.
 *
 * @param scale - The GPA scale.
 * @returns The default maximum value for that scale.
 */
export function defaultGpaMax(scale: GpaScale): number {
  if (scale === '5.0') return 5
  if (scale === 'percentage') return 100
  return 4
}
