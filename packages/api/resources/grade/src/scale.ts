/**
 * Letter-grade scale helpers.
 *
 * Pure, database-agnostic functions: take a score and a scale, return a
 * letter / GPA contribution. Used by both handlers and aggregators so
 * the resolution rule has exactly one home.
 *
 * @module
 */

import type { GradeScale, GradeScaleRung } from './types.js'

/**
 * The default US 4.0 plus/minus letter-grade scale.
 *
 * Rounding is whatever the caller stores; the resolver only checks
 * inclusive thresholds. Rungs are listed highest-first for clarity but
 * {@link resolveLetter} sorts internally so any order works.
 */
export const defaultGradeScale: GradeScale = {
  name: 'US 4.0 plus/minus',
  rungs: [
    { letter: 'A', minPercent: 93, gpaPoints: 4.0 },
    { letter: 'A-', minPercent: 90, gpaPoints: 3.7 },
    { letter: 'B+', minPercent: 87, gpaPoints: 3.3 },
    { letter: 'B', minPercent: 83, gpaPoints: 3.0 },
    { letter: 'B-', minPercent: 80, gpaPoints: 2.7 },
    { letter: 'C+', minPercent: 77, gpaPoints: 2.3 },
    { letter: 'C', minPercent: 73, gpaPoints: 2.0 },
    { letter: 'C-', minPercent: 70, gpaPoints: 1.7 },
    { letter: 'D+', minPercent: 67, gpaPoints: 1.3 },
    { letter: 'D', minPercent: 60, gpaPoints: 1.0 },
    { letter: 'F', minPercent: 0, gpaPoints: 0.0 },
  ],
}

/**
 * Sort scale rungs in descending threshold order so the first match wins.
 * @param scale - The scale to sort.
 * @returns A new array of rungs sorted highest threshold first.
 */
function sortedRungs(scale: GradeScale): GradeScaleRung[] {
  return [...scale.rungs].sort((a, b) => b.minPercent - a.minPercent)
}

/**
 * Resolve a score percentage to its letter-grade rung on the given scale.
 * @param percent - Score percentage 0–100.
 * @param scale - The grade scale to apply.
 * @returns The matching rung, or null if no rung matches (empty scale).
 */
export function resolveRung(percent: number, scale: GradeScale): GradeScaleRung | null {
  for (const rung of sortedRungs(scale)) {
    if (percent >= rung.minPercent) return rung
  }
  return null
}

/**
 * Resolve a score percentage to a letter on the given scale.
 * @param percent - Score percentage 0–100.
 * @param scale - The grade scale to apply.
 * @returns The matching letter, or null if no rung matches.
 */
export function resolveLetter(percent: number, scale: GradeScale): string | null {
  return resolveRung(percent, scale)?.letter ?? null
}

/**
 * Compute the percentage value of a score / max pair.
 * @param scorePoints - Earned points.
 * @param maxPoints - Possible points.
 * @returns Percentage 0–100, or null if `maxPoints <= 0`.
 */
export function toPercent(scorePoints: number, maxPoints: number): number | null {
  if (maxPoints <= 0) return null
  return (scorePoints / maxPoints) * 100
}
