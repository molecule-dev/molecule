/**
 * The public `gradeAnswer` dispatcher + speed-bonus logic.
 *
 * @module
 */

import {
  gradeFillBlank,
  gradeMatching,
  gradeMultiChoice,
  gradeNumeric,
  gradeTrueFalse,
  gradeTypeAnswer,
  type GradedAnswer,
} from './graders.js'
import type { AnswerFor, GradeOptions, GradeResult, Question } from './types.js'

const DEFAULT_SPEED_BONUS_MAX_FACTOR = 0.5

/**
 * Compute the multiplicative speed-bonus factor for an elapsed-time
 * answer. Returns `1` when no time data is provided.
 *
 * Formula: `1 + maxFactor * max(0, 1 - elapsed/limit)` clamped so very
 * slow answers receive no bonus and over-budget answers also get `1`.
 *
 * @param elapsedMs - Time spent on the question in ms.
 * @param timeLimitMs - Question's time limit in ms.
 * @param maxFactor - Maximum extra fraction (e.g. `0.5` ⇒ +50% bonus cap).
 * @returns Multiplier in `[1, 1 + maxFactor]`.
 */
export const computeSpeedFactor = (
  elapsedMs: number | undefined,
  timeLimitMs: number | undefined,
  maxFactor: number,
): number => {
  if (
    elapsedMs == null ||
    timeLimitMs == null ||
    !Number.isFinite(elapsedMs) ||
    !Number.isFinite(timeLimitMs) ||
    timeLimitMs <= 0 ||
    maxFactor <= 0
  ) {
    return 1
  }
  const remaining = Math.max(0, 1 - Math.max(0, elapsedMs) / timeLimitMs)
  return 1 + maxFactor * remaining
}

const dispatch = <Q extends Question>(question: Q, answer: AnswerFor<Q>): GradedAnswer => {
  switch (question.kind) {
    case 'multi-choice':
      return gradeMultiChoice(question.payload, answer as number[])
    case 'true-false':
      return gradeTrueFalse(question.payload, answer as boolean)
    case 'type-answer':
      return gradeTypeAnswer(question.payload, answer as string)
    case 'fill-blank':
      return gradeFillBlank(question.payload, answer as string[])
    case 'numeric':
      return gradeNumeric(question.payload, answer as number)
    case 'matching':
      return gradeMatching(question.payload, answer as Record<string, string>)
    /* c8 ignore next 4 — exhaustive guard, unreachable for valid input. */
    default: {
      const _never: never = question
      throw new Error(`Unsupported question kind: ${String((_never as Question).kind)}`)
    }
  }
}

/**
 * Grade a submitted answer against its question.
 *
 * Pure function: the same input always returns the same output. No I/O,
 * no clock reads — pass `elapsedMs` explicitly when you want a speed
 * bonus.
 *
 * @param question - The question + correct-answer payload.
 * @param answer - The user's submitted answer (shape depends on kind).
 * @param options - Optional speed-bonus inputs.
 * @returns Grade result with `is_correct`, `points_earned`, `explanation`.
 *
 * @example
 * ```ts
 * gradeAnswer(
 *   { kind: 'multi-choice', payload: { correctIndices: [1], optionCount: 4 }, points: 10 },
 *   [1],
 * )
 * // → { is_correct: true, points_earned: 10, explanation: 'correct' }
 * ```
 */
export const gradeAnswer = <Q extends Question>(
  question: Q,
  answer: AnswerFor<Q>,
  options?: GradeOptions,
): GradeResult => {
  const graded = dispatch(question, answer)
  const points = question.points ?? 1
  const maxFactor = options?.speedBonusMaxFactor ?? DEFAULT_SPEED_BONUS_MAX_FACTOR
  const speedFactor =
    graded.fraction > 0
      ? computeSpeedFactor(options?.elapsedMs, question.timeLimitMs, maxFactor)
      : 1

  const points_earned = points * graded.fraction * speedFactor

  return {
    is_correct: graded.isCorrect,
    points_earned,
    explanation: graded.explanation,
  }
}
