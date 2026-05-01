/**
 * Per-kind graders. Each function consumes a question payload + a
 * caller-supplied answer and returns an unscored {@link GradedAnswer}
 * describing correctness — the points multiplication and speed-bonus
 * application is the dispatcher's job (see `engine.ts`).
 *
 * @module
 */

import { editDistance, normalizeText } from './normalize.js'
import type {
  FillBlankPayload,
  MatchingPayload,
  MultiChoicePayload,
  NumericPayload,
  TrueFalsePayload,
  TypeAnswerPayload,
} from './types.js'

/**
 * Intermediate scoring result emitted by every per-kind grader.
 *
 * `fraction` is in `[0, 1]` and represents the share of `points` earned
 * before any speed bonus.
 */
export interface GradedAnswer {
  /** Whether the answer is fully correct. */
  isCorrect: boolean
  /** Fraction of base points earned, in `[0, 1]`. */
  fraction: number
  /** Locale-independent explanation key. */
  explanation: string
}

const FULL: GradedAnswer = { isCorrect: true, fraction: 1, explanation: 'correct' }
const ZERO: GradedAnswer = { isCorrect: false, fraction: 0, explanation: 'incorrect' }

/**
 * Grade a multi-choice question.
 *
 * - Single-correct: the answer must contain exactly the one correct index.
 * - Multi-correct (no partial): the selected set must equal the correct set.
 * - Multi-correct (with `allowPartial`): each correct selection earns
 *   `1/|correct|` and each incorrect selection deducts `1/(optionCount - |correct|)`,
 *   floored at zero. Awarded fraction is in `[0, 1]`.
 *
 * @param payload - Question payload.
 * @param answer - Selected option indices (may contain duplicates / out-of-range — ignored).
 * @returns Graded answer.
 */
export const gradeMultiChoice = (payload: MultiChoicePayload, answer: number[]): GradedAnswer => {
  const correctSet = new Set(payload.correctIndices)
  const validAnswer = Array.from(
    new Set(answer.filter((i) => Number.isInteger(i) && i >= 0 && i < payload.optionCount)),
  )
  const submittedSet = new Set(validAnswer)

  let truePositive = 0
  let falsePositive = 0
  for (const i of submittedSet) {
    if (correctSet.has(i)) truePositive += 1
    else falsePositive += 1
  }

  const exactMatch = truePositive === correctSet.size && falsePositive === 0
  if (exactMatch) return FULL

  if (!payload.allowPartial) return ZERO

  const correctCount = correctSet.size
  const wrongCount = Math.max(payload.optionCount - correctCount, 1)
  const positive = correctCount === 0 ? 0 : truePositive / correctCount
  const negative = falsePositive / wrongCount
  const fraction = Math.max(0, positive - negative)

  if (fraction === 0) return ZERO
  if (fraction >= 1) return FULL
  return { isCorrect: false, fraction, explanation: 'partial' }
}

/**
 * Grade a true/false question.
 *
 * @param payload - Question payload.
 * @param answer - Submitted boolean.
 * @returns Graded answer.
 */
export const gradeTrueFalse = (payload: TrueFalsePayload, answer: boolean): GradedAnswer =>
  answer === payload.correct ? FULL : ZERO

/**
 * Grade a free-text "type-answer" question.
 *
 * The submitted string is normalised then compared (exactly or with
 * Levenshtein fuzzy match) against every accepted answer.
 *
 * @param payload - Question payload.
 * @param answer - Submitted string.
 * @returns Graded answer.
 */
export const gradeTypeAnswer = (payload: TypeAnswerPayload, answer: string): GradedAnswer => {
  const match = payload.match ?? {}
  const maxEditDistance = match.maxEditDistance ?? 0
  const normalisedAnswer = normalizeText(answer ?? '', match)

  if (normalisedAnswer.length === 0) return ZERO

  for (const candidate of payload.acceptedAnswers) {
    const normalisedCandidate = normalizeText(candidate, match)
    if (normalisedCandidate === normalisedAnswer) return FULL
  }

  if (maxEditDistance > 0) {
    for (const candidate of payload.acceptedAnswers) {
      const normalisedCandidate = normalizeText(candidate, match)
      if (editDistance(normalisedCandidate, normalisedAnswer) <= maxEditDistance) {
        return { isCorrect: true, fraction: 1, explanation: 'correct.fuzzy' }
      }
    }
  }

  return ZERO
}

/**
 * Grade a fill-in-the-blank question.
 *
 * Each blank is graded independently. With `allowPartial` (default), the
 * earned fraction is `correctBlanks / totalBlanks`. Without it, the
 * grader returns full credit only when every blank matches.
 *
 * @param payload - Question payload.
 * @param answer - Submitted strings, one per blank, in order.
 * @returns Graded answer.
 */
export const gradeFillBlank = (payload: FillBlankPayload, answer: string[]): GradedAnswer => {
  const total = payload.blanks.length
  if (total === 0) return FULL

  const allowPartial = payload.allowPartial ?? true
  const match = payload.match ?? {}
  let correctCount = 0

  for (let i = 0; i < total; i += 1) {
    const submitted = normalizeText(answer[i] ?? '', match)
    if (submitted.length === 0) continue
    const accepted = payload.blanks[i].acceptedAnswers
    let matched = false
    for (const candidate of accepted) {
      if (normalizeText(candidate, match) === submitted) {
        matched = true
        break
      }
    }
    if (matched) correctCount += 1
  }

  if (correctCount === total) return FULL
  if (correctCount === 0) return ZERO
  if (!allowPartial) return ZERO
  return { isCorrect: false, fraction: correctCount / total, explanation: 'partial' }
}

/**
 * Grade a numeric question with optional absolute tolerance.
 *
 * @param payload - Question payload.
 * @param answer - Submitted number.
 * @returns Graded answer.
 */
export const gradeNumeric = (payload: NumericPayload, answer: number): GradedAnswer => {
  if (typeof answer !== 'number' || !Number.isFinite(answer)) {
    return { isCorrect: false, fraction: 0, explanation: 'numeric.invalid' }
  }
  const tolerance = payload.tolerance ?? 0
  if (Math.abs(answer - payload.correct) <= tolerance) return FULL
  return { isCorrect: false, fraction: 0, explanation: 'numeric.outOfTolerance' }
}

/**
 * Grade a matching-pairs question.
 *
 * Each correct pair earns `1/totalPairs`. With `allowPartial` (default),
 * partial credit is reported. Without it, the grader returns full
 * credit only when every pair matches.
 *
 * @param payload - Question payload.
 * @param answer - Submitted mapping `{ leftId: rightId }`.
 * @returns Graded answer.
 */
export const gradeMatching = (
  payload: MatchingPayload,
  answer: Record<string, string>,
): GradedAnswer => {
  const expected = payload.pairs
  const keys = Object.keys(expected)
  const total = keys.length
  if (total === 0) return FULL

  const allowPartial = payload.allowPartial ?? true
  let correctCount = 0
  for (const leftId of keys) {
    if (answer && answer[leftId] === expected[leftId]) correctCount += 1
  }

  if (correctCount === total) return FULL
  if (correctCount === 0) return ZERO
  if (!allowPartial) return ZERO
  return { isCorrect: false, fraction: correctCount / total, explanation: 'partial' }
}
