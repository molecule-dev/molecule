/**
 * Types of `@molecule/app-flashcard-card-solid` — the Solid counterpart of
 * `@molecule/app-flashcard-card-react`, same props and DOM.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/**
 * SM-2-compatible grade values the caller uses to schedule the next review.
 * Same union as React's `SrsGrade`.
 */
export type SrsGrade = 'again' | 'hard' | 'good' | 'easy'

/** Props accepted by the {@link FlashcardCard} component (React's names). */
export interface FlashcardCardProps {
  /** Front content (prompt). */
  front: JSX.Element
  /** Back content (answer). */
  back: JSX.Element
  /** Called when the user grades the card after revealing the answer. */
  onGrade?: (grade: SrsGrade) => void
  /** Optional progress / position. */
  progress?: JSX.Element
  /** Initially show the answer. Defaults to `false`. */
  defaultRevealed?: boolean
  /** Extra classes. */
  className?: string
}
