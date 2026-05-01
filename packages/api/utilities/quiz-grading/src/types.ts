/**
 * Type definitions for the quiz-grading engine.
 *
 * All graders are pure functions: given a question + a submitted answer,
 * they return a {@link GradeResult}. No I/O, no time-of-day side effects
 * (the caller passes elapsed milliseconds explicitly).
 *
 * @module
 */

/**
 * Discriminator for the supported question kinds.
 *
 * - `multi-choice`   — pick one or more correct options from a fixed list.
 * - `true-false`     — boolean answer.
 * - `type-answer`    — free-text response matched against accepted answers.
 * - `fill-blank`     — one or more blanks each with accepted answers.
 * - `numeric`        — numeric answer with optional tolerance.
 * - `matching`       — match items in column A to items in column B.
 */
export type QuestionKind =
  | 'multi-choice'
  | 'true-false'
  | 'type-answer'
  | 'fill-blank'
  | 'numeric'
  | 'matching'

/**
 * String-comparison normalisation flags used by text-based graders.
 *
 * All flags default to `true` (i.e. forgiving comparison) when omitted.
 */
export interface TextMatchOptions {
  /** Lowercase both sides before comparison. Default: `true`. */
  caseInsensitive?: boolean
  /** Strip leading/trailing whitespace. Default: `true`. */
  trim?: boolean
  /** Collapse internal whitespace to a single space. Default: `true`. */
  collapseWhitespace?: boolean
  /** Strip diacritics (NFD + remove combining marks). Default: `true`. */
  accentFold?: boolean
}

/**
 * Fuzzy-match options for `type-answer` questions.
 *
 * When `maxEditDistance > 0`, the grader accepts answers within the given
 * Levenshtein edit distance of any accepted answer. When omitted, only
 * exact (post-normalisation) matches are accepted.
 */
export interface FuzzyMatchOptions extends TextMatchOptions {
  /** Maximum Levenshtein distance for a fuzzy match. 0 disables fuzzy matching. */
  maxEditDistance?: number
}

/** Payload for a multi-choice question. */
export interface MultiChoicePayload {
  /** Indices (0-based) into the option list that are correct. */
  correctIndices: number[]
  /**
   * When `true`, partial credit is awarded for selecting some-but-not-all
   * correct options (with a penalty for incorrect selections). Default: `false`.
   */
  allowPartial?: boolean
  /** Total option count — used to bound partial-credit denominators. */
  optionCount: number
}

/** Payload for a true-false question. */
export interface TrueFalsePayload {
  /** The correct boolean. */
  correct: boolean
}

/** Payload for a free-text "type-answer" question. */
export interface TypeAnswerPayload {
  /** All accepted spellings of the correct answer. */
  acceptedAnswers: string[]
  /** Normalisation + fuzzy-match options. */
  match?: FuzzyMatchOptions
}

/** Payload for a fill-in-the-blank question (one or more blanks). */
export interface FillBlankPayload {
  /** For each blank in order, the list of accepted answers for that blank. */
  blanks: Array<{ acceptedAnswers: string[] }>
  /** Normalisation options applied to every blank. */
  match?: TextMatchOptions
  /**
   * When `true`, each correctly-filled blank earns proportional partial
   * credit (1/N of the question's points). When `false`, all blanks must
   * be correct for any credit. Default: `true`.
   */
  allowPartial?: boolean
}

/** Payload for a numeric question with optional tolerance. */
export interface NumericPayload {
  /** Expected numeric value. */
  correct: number
  /** Absolute tolerance — `|submitted - correct| <= tolerance` is correct. Default: 0. */
  tolerance?: number
}

/** Payload for a matching-pairs question. */
export interface MatchingPayload {
  /**
   * The correct mapping. Keys are left-column ids, values are the
   * right-column id that should be paired with them.
   */
  pairs: Record<string, string>
  /**
   * When `true`, each correct pair earns proportional partial credit.
   * When `false`, all pairs must be correct. Default: `true`.
   */
  allowPartial?: boolean
}

/**
 * Maps a {@link QuestionKind} to its payload type.
 */
export interface QuestionPayloadMap {
  'multi-choice': MultiChoicePayload
  'true-false': TrueFalsePayload
  'type-answer': TypeAnswerPayload
  'fill-blank': FillBlankPayload
  numeric: NumericPayload
  matching: MatchingPayload
}

/**
 * A discriminated-union question shape. Use this as the canonical input
 * type for {@link gradeAnswer}.
 */
export type Question = {
  [K in QuestionKind]: {
    /** Stable identifier, useful for caller-side bookkeeping. */
    id?: string
    /** Question kind discriminator. */
    kind: K
    /** Kind-specific payload. */
    payload: QuestionPayloadMap[K]
    /** Maximum points awardable. Default: 1. */
    points?: number
    /**
     * Time limit in milliseconds. When provided alongside
     * {@link GradeOptions.elapsedMs}, the speed-bonus formula is applied.
     */
    timeLimitMs?: number
  }
}[QuestionKind]

/**
 * Maps a {@link QuestionKind} to its accepted answer shape.
 *
 * - `multi-choice`   — array of selected indices.
 * - `true-false`     — boolean.
 * - `type-answer`    — string.
 * - `fill-blank`     — string array (one entry per blank, in order).
 * - `numeric`        — number.
 * - `matching`       — `Record<leftId, rightId>`.
 */
export interface AnswerMap {
  'multi-choice': number[]
  'true-false': boolean
  'type-answer': string
  'fill-blank': string[]
  numeric: number
  matching: Record<string, string>
}

/** Per-kind answer type, keyed off the question's `kind`. */
export type AnswerFor<Q extends Question> = AnswerMap[Q['kind']]

/**
 * Optional inputs to the grader.
 */
export interface GradeOptions {
  /**
   * Elapsed milliseconds spent on the question. When set together with
   * `question.timeLimitMs`, a multiplicative speed bonus is applied to
   * earned points using the formula:
   *
   * `speedFactor = 1 + speedBonusMaxFactor * max(0, 1 - elapsedMs/timeLimitMs)`
   *
   * Capped so `points_earned <= points * (1 + speedBonusMaxFactor)`.
   */
  elapsedMs?: number
  /**
   * Maximum extra fraction of `points` awarded for instant answers.
   * Default: 0.5 (i.e. up to +50% for a zero-elapsed answer).
   */
  speedBonusMaxFactor?: number
}

/**
 * Result of grading a single question.
 */
export interface GradeResult {
  /** `true` when the answer fully satisfies the question (no partial credit). */
  is_correct: boolean
  /**
   * Points awarded. In `[0, points * (1 + speedBonusMaxFactor)]`.
   * Partial-credit kinds may report a fractional value strictly between
   * 0 and the max.
   */
  points_earned: number
  /**
   * Stable, locale-independent explanation key (e.g. `'correct'`,
   * `'incorrect'`, `'partial'`, `'numeric.outOfTolerance'`). Consumers
   * who want a localised string should map this key through their own
   * i18n layer.
   */
  explanation?: string
}
