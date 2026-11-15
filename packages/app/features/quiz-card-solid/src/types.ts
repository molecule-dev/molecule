/**
 * Types of `@molecule/app-quiz-card-solid` — the Solid counterpart of
 * `@molecule/app-quiz-card-react`, same props and DOM.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** A single selectable answer option in a quiz question. */
export interface QuizOption {
  /** The option's identifier, used for selection and as the rendered key. */
  id: string
  /** The option's label. */
  label: JSX.Element
}

/** Props accepted by the {@link QuizCard} component (React's names). */
export interface QuizCardProps {
  /** The question text. */
  question: JSX.Element
  /** Answer options. */
  options: QuizOption[]
  /** Id of the correct option — when provided, the component reveals correct/incorrect on submit. */
  correctId?: string
  /** Called when the user submits an answer. */
  onAnswer?: (optionId: string, correct?: boolean) => void
  /** Progress display — e.g. `2 / 10`. */
  progress?: JSX.Element
  /** Optional countdown / timer node above the question. */
  timer?: JSX.Element
  /** Explanation shown after submit. */
  explanation?: JSX.Element
  /** Extra classes. */
  className?: string
}
