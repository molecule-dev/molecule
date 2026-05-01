/**
 * Pure-function multi-question-type grading engine for molecule.dev.
 *
 * Supports six question kinds: `multi-choice` (single + multi-correct,
 * optional partial credit), `true-false`, `type-answer` (exact + fuzzy
 * Levenshtein with case/whitespace/accent normalisation), `fill-blank`
 * (per-blank partial credit), `numeric` (with tolerance), and
 * `matching` pairs (with partial credit). A multiplicative speed bonus
 * is applied when the caller supplies `elapsedMs` and the question
 * defines a `timeLimitMs`.
 *
 * No I/O, no DB, no clock reads — every grading decision is a pure
 * function of `(question, answer, options)`. This keeps it equally
 * usable from API handlers, AI pipelines, mock-server fixtures, and
 * frontend test harnesses.
 *
 * Used by lms, quiz-platform, language-learning, and any other app
 * that needs question-grading.
 *
 * @example
 * ```ts
 * import { gradeAnswer } from '@molecule/api-quiz-grading'
 *
 * gradeAnswer(
 *   {
 *     kind: 'type-answer',
 *     payload: { acceptedAnswers: ['Paris'], match: { maxEditDistance: 1 } },
 *     points: 5,
 *   },
 *   'paris',
 * )
 * // → { is_correct: true, points_earned: 5, explanation: 'correct' }
 * ```
 *
 * @example
 * ```ts
 * import { gradeAnswer } from '@molecule/api-quiz-grading'
 *
 * gradeAnswer(
 *   {
 *     kind: 'multi-choice',
 *     payload: { correctIndices: [0, 2], optionCount: 4, allowPartial: true },
 *     points: 10,
 *   },
 *   [0],
 * )
 * // → { is_correct: false, points_earned: 5, explanation: 'partial' }
 * ```
 *
 * @module
 */

export * from './engine.js'
export * from './graders.js'
export * from './normalize.js'
export * from './schemas.js'
export * from './types.js'
