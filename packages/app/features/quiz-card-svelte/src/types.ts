/**
 * Types of `@molecule/app-quiz-card-svelte` — the Svelte counterpart of
 * `@molecule/app-quiz-card-react`, same props and DOM.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** A single selectable answer option in a quiz question. */
export interface QuizOption {
  /** The option's identifier, used for selection and as the rendered key. */
  id: string
  /** The option's label — a snippet or a plain string. */
  label: Snippet | string
}

/** Props accepted by the {@link QuizCard} component (React's names). */
export interface QuizCardProps {
  /** The question text — a snippet or a plain string. */
  question: Snippet | string
  /** Answer options. */
  options: QuizOption[]
  /** Id of the correct option — when provided, the component reveals correct/incorrect on submit. */
  correctId?: string
  /** Called when the user submits an answer. */
  onAnswer?: (optionId: string, correct?: boolean) => void
  /** Progress display — e.g. `2 / 10` — a snippet or a plain string. */
  progress?: Snippet | string
  /** Optional countdown / timer node above the question — a snippet or a plain string. */
  timer?: Snippet | string
  /** Explanation shown after submit — a snippet or a plain string. */
  explanation?: Snippet | string
  /** Extra classes. */
  className?: string
}
