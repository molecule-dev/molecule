/**
 * Public types for the SM-2 spaced-repetition algorithm.
 *
 * @module
 */

/**
 * SM-2 review quality / grade scale, as defined in Wozniak (1990).
 *
 * - `0` — Complete blackout. No recognition.
 * - `1` — Incorrect; the correct answer felt familiar once shown.
 * - `2` — Incorrect; the correct answer seemed easy in hindsight.
 * - `3` — Correct, but recalled with serious difficulty.
 * - `4` — Correct, recalled with some hesitation.
 * - `5` — Perfect recall.
 *
 * Grades `< 3` are treated as failures: repetitions reset to `0` and the
 * interval resets to `1` day. Grades `>= 3` advance the schedule.
 */
export type SpacedRepetitionGrade = 0 | 1 | 2 | 3 | 4 | 5

/**
 * Persisted state for a card / item being scheduled by SM-2.
 *
 * `next_review` is the absolute time at which the item becomes due.
 * It is computed as `now + interval_days * 24h` — i.e. an exact
 * 24-hour multiple, NOT a calendar-day boundary in any timezone. This
 * keeps the algorithm timezone-independent: callers that want
 * "midnight in the user's local timezone" can post-process
 * `next_review` themselves.
 */
export interface SpacedRepetitionState {
  /**
   * Multiplier applied to the previous interval once a card has been
   * reviewed at least twice. Floor of `1.3` per Wozniak. SM-2 default
   * for a brand-new card is `2.5`.
   */
  ease_factor: number
  /**
   * Number of days until the next review. `0` for a card that has
   * never been reviewed. After a successful first review this becomes
   * `1`; after a successful second review it becomes `6`; subsequent
   * reviews multiply by `ease_factor`.
   */
  interval_days: number
  /**
   * Count of consecutive successful reviews (grade `>= 3`). Resets to
   * `0` on any failed review.
   */
  repetitions: number
  /**
   * Lifetime count of failed reviews (grade `< 3`). Never decreases.
   * Useful for surfacing "leech" cards that lapse repeatedly.
   */
  lapses: number
  /**
   * Absolute time at which this card is next due for review. Compared
   * with `Date.now()` to determine due cards.
   */
  next_review: Date
}

/**
 * Optional inputs for {@link reviewSm2}.
 */
export interface ReviewOptions {
  /**
   * Override the "current time" used to compute `next_review`. Useful
   * for deterministic tests and replaying review logs. Defaults to
   * `new Date()`.
   */
  now?: Date
}
