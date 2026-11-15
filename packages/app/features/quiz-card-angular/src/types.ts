/**
 * Types of `@molecule/app-quiz-card-angular` — the Angular counterpart of
 * `@molecule/app-quiz-card-react`, same props and DOM.
 *
 * @module
 */

/**
 * A single selectable answer option in a quiz question.
 *
 * `label` is a string (rendered as text) or an embedded template (a node
 * input cannot travel through an Angular input, so callers pass nodes as
 * templates where the framework supplies them).
 */
export interface QuizOption {
  /** The option's identifier, used for selection and as the rendered key. */
  id: string
  /** The option's label: a plain string, or a template rendering the nodes. */
  label: unknown
}

/**
 * Props accepted by {@link QuizCard} — the same props
 * `@molecule/app-quiz-card-react` accepts. Node props (`question`, `progress`,
 * `timer`, `explanation`) are projected content in Angular (an input cannot
 * carry a node), so they are typed `unknown`: pass them as
 * `[slot=question]` / `[slot=progress]` / `[slot=timer]` /
 * `[slot=explanation]` content, or as plain strings.
 */
export interface QuizCardProps {
  /** The question text, projected as `[slot=question]` content or a string. */
  question?: unknown
  /** Answer options. */
  options: QuizOption[]
  /** Id of the correct option — when provided, the component reveals correct/incorrect on submit. */
  correctId?: string
  /** Called when the user submits an answer. */
  onAnswer?: (optionId: string, correct?: boolean) => void
  /** Progress display — e.g. `2 / 10` — projected as `[slot=progress]` content or a string. */
  progress?: unknown
  /** Optional countdown / timer node, projected as `[slot=timer]` content or a string. */
  timer?: unknown
  /** Explanation shown after submit, projected as `[slot=explanation]` content or a string. */
  explanation?: unknown
  /** Extra classes. */
  className?: string
}
