/**
 * Types of `@molecule/app-flashcard-card-vue` — the Vue counterpart of
 * `@molecule/app-flashcard-card-react`, same props and DOM.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/**
 * SM-2-compatible grade values the caller uses to schedule the next review.
 * Same union as React's `SrsGrade`.
 */
export type SrsGrade = 'again' | 'hard' | 'good' | 'easy'

/** Props accepted by the {@link FlashcardCard} component (React's names). */
export interface FlashcardCardProps {
  /**
   * Front content (prompt). Passed as a prop or as the same-named slot —
   * both work.
   */
  front: VNodeChild
  /**
   * Back content (answer). Passed as a prop or as the same-named slot —
   * both work.
   */
  back: VNodeChild
  /** Called when the user grades the card after revealing the answer. */
  onGrade?: (grade: SrsGrade) => void
  /** Optional progress / position. Passed as a prop or as the same-named slot. */
  progress?: VNodeChild
  /** Initially show the answer. Defaults to `false`. */
  defaultRevealed?: boolean
  /** Extra classes. */
  className?: string
}
