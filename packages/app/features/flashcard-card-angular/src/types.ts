/**
 * Types of `@molecule/app-flashcard-card-angular` — the Angular counterpart of
 * `@molecule/app-flashcard-card-react`, same props and DOM.
 *
 * @module
 */

/**
 * SM-2-compatible grade values the caller uses to schedule the next review.
 * Same union as React's `SrsGrade`.
 */
export type SrsGrade = 'again' | 'hard' | 'good' | 'easy'

/**
 * Props accepted by {@link FlashcardCard} — the same props
 * `@molecule/app-flashcard-card-react` accepts. Node props (`front`, `back`,
 * `progress`) are projected content in Angular (an input cannot carry a node),
 * so they are typed `unknown`: pass them as `[slot=front]` / `[slot=back]` /
 * `[slot=progress]` content, or as plain strings.
 */
export interface FlashcardCardProps {
  /** Front content (prompt), projected as `[slot=front]` content or a string. */
  front?: unknown
  /** Back content (answer), projected as `[slot=back]` content or a string. */
  back?: unknown
  /** Optional progress / position, projected as `[slot=progress]` content or a string. */
  progress?: unknown
  /** Called when the user grades the card after revealing the answer. */
  onGrade?: (grade: SrsGrade) => void
  /** Initially show the answer. Read once, like React's `useState`. */
  defaultRevealed?: boolean
  /** Extra classes on the card. */
  className?: string
}
