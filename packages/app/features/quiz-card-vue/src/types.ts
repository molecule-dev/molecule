/**
 * Types of `@molecule/app-quiz-card-vue` — the Vue counterpart of
 * `@molecule/app-quiz-card-react`, same props and DOM.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** A single selectable answer option in a quiz question. */
export interface QuizOption {
  /** The option's identifier, used for selection and as the rendered key. */
  id: string
  /** The option's label. Passed as a prop or as a same-named slot. */
  label: VNodeChild
}

/** Props accepted by the {@link QuizCard} component (React's names). */
export interface QuizCardProps {
  /** The question text. Passed as a prop or as the same-named slot. */
  question: VNodeChild
  /** Answer options. */
  options: QuizOption[]
  /** Id of the correct option — when provided, the component reveals correct/incorrect on submit. */
  correctId?: string
  /** Called when the user submits an answer. */
  onAnswer?: (optionId: string, correct?: boolean) => void
  /** Progress display — e.g. `2 / 10`. Passed as a prop or as the same-named slot. */
  progress?: VNodeChild
  /** Optional countdown / timer node above the question. Passed as a prop or as the same-named slot. */
  timer?: VNodeChild
  /** Explanation shown after submit. Passed as a prop or as the same-named slot. */
  explanation?: VNodeChild
  /** Extra classes. */
  className?: string
}
