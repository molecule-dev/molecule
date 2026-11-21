/**
 * Status resolution for the stage timeline — ported from
 * `@molecule/app-stage-timeline-react`'s `statusOf`.
 *
 * @module
 */

import type { StageStatus } from './types.js'

/**
 * Resolve a stage's rendering status given its index and the current index.
 *
 * @param i - Zero-based stage index.
 * @param currentIndex - Index of the current stage (`-1` = none, `len` = all done).
 * @returns The rendering status for stage `i`.
 */
export function statusOf(i: number, currentIndex: number): StageStatus {
  if (i < currentIndex) return 'completed'
  if (i === currentIndex) return 'current'
  return 'upcoming'
}
