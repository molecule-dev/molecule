/**
 * Pure reputation engine.
 *
 * Stateless helpers for deriving level from score. Has no external
 * dependencies and is fully unit-testable without a database.
 *
 * @module
 */

import { DEFAULT_LEVEL_THRESHOLDS } from './types.js'

/**
 * Computes the level for a given score against ascending thresholds.
 *
 * Threshold semantics: index `i` is the lower bound (inclusive) for
 * level `i`. The returned level is the highest index whose threshold
 * is `<= score`. Negative scores are clamped to level `0`.
 *
 * @param score - Cumulative reputation score.
 * @param thresholds - Ascending lower bounds per level. Defaults to
 *   {@link DEFAULT_LEVEL_THRESHOLDS}. Must be non-empty and ascending.
 * @returns The derived level (always `>= 0`).
 */
export function computeLevel(
  score: number,
  thresholds: readonly number[] = DEFAULT_LEVEL_THRESHOLDS,
): number {
  if (thresholds.length === 0) return 0
  let level = 0
  for (let i = 0; i < thresholds.length; i++) {
    if (score >= thresholds[i]!) {
      level = i
    } else {
      break
    }
  }
  return level
}
