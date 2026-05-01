/**
 * Pure helpers for mapping reputation scores to levels and tier colors.
 *
 * Kept framework-free so they're trivially unit-testable.
 *
 * @module
 */

import type { ReputationLevel, ReputationThresholds } from './types.js'

/**
 * Default thresholds used when no `thresholds` prop is supplied.
 */
export const DEFAULT_THRESHOLDS: ReputationThresholds = {
  contributor: 100,
  trusted: 500,
  veteran: 2000,
  legend: 10000,
}

/**
 * Derive a {@link ReputationLevel} from a numeric score.
 *
 * Picks the highest level whose threshold is met or exceeded. Any score
 * below `thresholds.contributor` returns `'newcomer'`.
 *
 * @param score - Reputation score (any non-negative number).
 * @param thresholds - Optional override thresholds; defaults to {@link DEFAULT_THRESHOLDS}.
 * @returns The derived reputation level.
 */
export function levelForScore(
  score: number,
  thresholds: ReputationThresholds = DEFAULT_THRESHOLDS,
): ReputationLevel {
  if (score >= thresholds.legend) return 'legend'
  if (score >= thresholds.veteran) return 'veteran'
  if (score >= thresholds.trusted) return 'trusted'
  if (score >= thresholds.contributor) return 'contributor'
  return 'newcomer'
}

/**
 * Maps a {@link ReputationLevel} to the semantic Badge color used by the
 * shared `<Badge>` component (`@molecule/app-ui-react`).
 *
 * Apps that swap the ClassMap bond automatically restyle these chips.
 */
const LEVEL_TO_COLOR: Record<
  ReputationLevel,
  'primary' | 'secondary' | 'success' | 'warning' | 'info'
> = {
  newcomer: 'secondary',
  contributor: 'info',
  trusted: 'primary',
  veteran: 'success',
  legend: 'warning',
}

/**
 * Return the semantic Badge color for a given level.
 *
 * Unknown levels fall back to `'secondary'`.
 *
 * @param level - The reputation level.
 * @returns A badge color name from `@molecule/app-ui-react`.
 */
export function colorForLevel(
  level: ReputationLevel,
): 'primary' | 'secondary' | 'success' | 'warning' | 'info' {
  return LEVEL_TO_COLOR[level] ?? 'secondary'
}
