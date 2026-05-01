/**
 * Pure-function SM-2 spaced-repetition implementation, per Wozniak
 * (1990) "Optimization of repetition spacing in the course of
 * learning."
 *
 * @module
 */

import type { ReviewOptions, SpacedRepetitionGrade, SpacedRepetitionState } from './types.js'

/**
 * Default starting ease factor for a fresh card, per Wozniak.
 */
export const DEFAULT_EASE_FACTOR = 2.5

/**
 * Lower bound on the ease factor. SM-2 forbids easing below this.
 */
export const MIN_EASE_FACTOR = 1.3

/**
 * Number of milliseconds in one day. Used to compute `next_review`.
 */
const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Build a default state for a card that has never been reviewed. The
 * returned state is dueAt the supplied `now` (or right now if
 * omitted), so a brand-new card is immediately eligible for review.
 *
 * @param now - Reference time for `next_review`. Defaults to `new Date()`.
 * @returns A fresh, unreviewed-card state.
 */
export function initialSm2State(now: Date = new Date()): SpacedRepetitionState {
  return {
    ease_factor: DEFAULT_EASE_FACTOR,
    interval_days: 0,
    repetitions: 0,
    lapses: 0,
    next_review: new Date(now.getTime()),
  }
}

/**
 * Apply one SM-2 review to an item. Pure function — does no I/O, reads
 * no clocks except via the optional `options.now`.
 *
 * Algorithm:
 *
 * 1. Update ease factor: `EF' = max(1.3, EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))`
 * 2. If `quality < 3` → reset `repetitions = 0`, `interval = 1`, increment `lapses`.
 * 3. Else → `repetitions += 1`; first repetition gives `interval = 1`,
 *    second gives `interval = 6`, subsequent multiply previous interval by EF'.
 * 4. `next_review = now + interval * 24h`.
 *
 * @param state - Current persisted state of the item being reviewed.
 * @param quality - Grade `0..5` describing the user's recall performance.
 * @param options - Optional clock override (`options.now`).
 * @returns The updated state. The input `state` is not mutated.
 */
export function reviewSm2(
  state: SpacedRepetitionState,
  quality: SpacedRepetitionGrade,
  options: ReviewOptions = {},
): SpacedRepetitionState {
  const now = options.now ?? new Date()

  // 1. Update ease factor (always, even on failure — per Wozniak).
  const easeFactor = Math.max(
    MIN_EASE_FACTOR,
    state.ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  )

  // 2. Update repetitions and interval based on success/failure.
  let repetitions: number
  let intervalDays: number
  let lapses = state.lapses

  if (quality < 3) {
    repetitions = 0
    intervalDays = 1
    lapses += 1
  } else {
    repetitions = state.repetitions + 1
    if (repetitions === 1) {
      intervalDays = 1
    } else if (repetitions === 2) {
      intervalDays = 6
    } else {
      intervalDays = Math.round(state.interval_days * easeFactor)
    }
  }

  // 3. Compute next-review timestamp using exact 24-hour multiples
  //    (timezone-independent — callers can re-floor to local midnight).
  const nextReview = new Date(now.getTime() + intervalDays * MS_PER_DAY)

  return {
    ease_factor: easeFactor,
    interval_days: intervalDays,
    repetitions,
    lapses,
    next_review: nextReview,
  }
}
