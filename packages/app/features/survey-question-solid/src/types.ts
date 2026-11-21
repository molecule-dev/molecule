/**
 * Survey question types — discriminated union covering 11 question kinds
 * used by survey-feedback-tool, hr-management surveys, and voting-polling
 * apps. Designed to align with `@molecule/api-quiz-grading`'s `Question`
 * shape where the kinds overlap (multi-choice, true-false, numeric).
 *
 * @module
 */

/** Discriminator for the supported survey question kinds. */
export type SurveyQuestionKind =
  | 'multi-choice-single'
  | 'multi-choice-multi'
  | 'true-false'
  | 'short-text'
  | 'long-text'
  | 'numeric'
  | 'rating-scale'
  | 'nps'
  | 'date'
  | 'file-upload'
  | 'matrix'

/** Common fields shared by every survey-question kind. */
export interface SurveyQuestionBase {
  /** Stable identifier for caller bookkeeping. */
  id: string
  /** Question text shown to the respondent. */
  prompt: string
  /** Optional secondary description rendered under the prompt. */
  description?: string
  /** Optional hint shown beneath the input control. */
  helpText?: string
  /** Whether the respondent must answer this question. Default: false. */
  required?: boolean
}

/** Multi-choice (single answer) — pick exactly one option. */
export interface MultiChoiceSingleQuestion extends SurveyQuestionBase {
  kind: 'multi-choice-single'
  /** Ordered list of options. */
  options: Array<{ value: string; label: string }>
}

/** Multi-choice (multiple answers) — pick zero or more options. */
export interface MultiChoiceMultiQuestion extends SurveyQuestionBase {
  kind: 'multi-choice-multi'
  /** Ordered list of options. */
  options: Array<{ value: string; label: string }>
}

/** Boolean true/false question. */
export interface TrueFalseQuestion extends SurveyQuestionBase {
  kind: 'true-false'
  /** Optional override label for "true". Default uses i18n `surveyQuestion.trueFalse.true`. */
  trueLabel?: string
  /** Optional override label for "false". */
  falseLabel?: string
}

/** Short single-line free-text answer. */
export interface ShortTextQuestion extends SurveyQuestionBase {
  kind: 'short-text'
  /** Optional placeholder. */
  placeholder?: string
  /** Optional max character length. */
  maxLength?: number
}

/** Long multi-line free-text answer. */
export interface LongTextQuestion extends SurveyQuestionBase {
  kind: 'long-text'
  /** Optional placeholder. */
  placeholder?: string
  /** Optional max character length. */
  maxLength?: number
  /** Number of textarea rows. Default: 4. */
  rows?: number
}

/** Numeric answer with optional unit suffix. */
export interface NumericQuestion extends SurveyQuestionBase {
  kind: 'numeric'
  /** Optional minimum value (inclusive). */
  min?: number
  /** Optional maximum value (inclusive). */
  max?: number
  /** Step increment for the numeric input. */
  step?: number
  /** Display-only unit shown after the input (e.g. "kg", "hours"). */
  unit?: string
}

/** Rating scale (1–5 / 1–10 etc.) — single-pick from a numeric range. */
export interface RatingScaleQuestion extends SurveyQuestionBase {
  kind: 'rating-scale'
  /** Lower bound of the scale (inclusive). Default: 1. */
  min?: number
  /** Upper bound of the scale (inclusive). Default: 5. */
  max?: number
  /** Optional label for the low end of the scale. */
  lowLabel?: string
  /** Optional label for the high end of the scale. */
  highLabel?: string
}

/** Net Promoter Score (0–10) question. */
export interface NPSQuestion extends SurveyQuestionBase {
  kind: 'nps'
  /** Optional override for the "not likely" label (0). */
  lowLabel?: string
  /** Optional override for the "very likely" label (10). */
  highLabel?: string
}

/** Date answer (rendered as a native date input). */
export interface DateQuestion extends SurveyQuestionBase {
  kind: 'date'
  /** Optional minimum ISO date `yyyy-mm-dd`. */
  min?: string
  /** Optional maximum ISO date `yyyy-mm-dd`. */
  max?: string
}

/** File-upload question. The bond uses `<FileDropzone>` from `@molecule/app-file-dropzone-react`. */
export interface FileUploadQuestion extends SurveyQuestionBase {
  kind: 'file-upload'
  /** Optional MIME / extension accept list (forwarded to the dropzone). */
  accept?: string
  /** Allow multiple files. */
  multiple?: boolean
  /** Maximum file size in bytes. */
  maxSize?: number
}

/** Matrix question — sub-questions × shared answer options. */
export interface MatrixQuestion extends SurveyQuestionBase {
  kind: 'matrix'
  /** Sub-question rows (each is its own prompt). */
  rows: Array<{ id: string; label: string }>
  /** Shared answer columns applied across every row. */
  columns: Array<{ value: string; label: string }>
}

/**
 * Discriminated-union question shape. Use this as the canonical input type
 * for `<SurveyQuestion>`. Named `SurveyQuestionDef` (rather than the bare
 * `SurveyQuestion`) so it doesn't collide with the exported component.
 */
export type SurveyQuestionDef =
  | MultiChoiceSingleQuestion
  | MultiChoiceMultiQuestion
  | TrueFalseQuestion
  | ShortTextQuestion
  | LongTextQuestion
  | NumericQuestion
  | RatingScaleQuestion
  | NPSQuestion
  | DateQuestion
  | FileUploadQuestion
  | MatrixQuestion

/** Maps a {@link SurveyQuestionKind} to its accepted answer shape. */
export interface SurveyAnswerMap {
  'multi-choice-single': string
  'multi-choice-multi': string[]
  'true-false': boolean
  'short-text': string
  'long-text': string
  numeric: number | ''
  'rating-scale': number
  nps: number
  date: string
  'file-upload': File[]
  matrix: Record<string, string>
}

/** Per-kind answer type. */
export type SurveyAnswerFor<Q extends SurveyQuestionDef> = SurveyAnswerMap[Q['kind']]

/** Generic value type accepted by `<SurveyQuestion>` regardless of kind. */
export type SurveyAnswerValue = SurveyAnswerMap[SurveyQuestionKind]
