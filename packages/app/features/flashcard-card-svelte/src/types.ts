/**
 * Types of `@molecule/app-flashcard-card-svelte` — the Svelte counterpart of
 * `@molecule/app-flashcard-card-react`, same props and DOM.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/**
 * SM-2-compatible grade values the caller uses to schedule the next review.
 * Same union as React's `SrsGrade`.
 */
export type SrsGrade = 'again' | 'hard' | 'good' | 'easy'

/** Props accepted by the {@link FlashcardCard} component (React's names). */
export interface FlashcardCardProps {
  /** Front content (prompt) — a snippet or a plain string. */
  front: Snippet | string
  /** Back content (answer) — a snippet or a plain string. */
  back: Snippet | string
  /** Called when the user grades the card after revealing the answer. */
  onGrade?: (grade: SrsGrade) => void
  /** Optional progress / position — a snippet or a plain string. */
  progress?: Snippet | string
  /** Initially show the answer. Defaults to `false`. */
  defaultRevealed?: boolean
  /** Extra classes. */
  className?: string
}
