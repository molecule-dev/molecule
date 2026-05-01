/**
 * Tests for `@molecule/api-quiz-grading`.
 *
 * Covers every question kind plus partial-credit modes, speed-bonus,
 * normalisation, fuzzy matching, and Zod schema validation.
 */

import { describe, expect, it } from 'vitest'

import { computeSpeedFactor, gradeAnswer } from '../engine.js'
import {
  gradeFillBlank,
  gradeMatching,
  gradeMultiChoice,
  gradeNumeric,
  gradeTrueFalse,
  gradeTypeAnswer,
} from '../graders.js'
import { editDistance, normalizeText } from '../normalize.js'
import {
  fillBlankPayloadSchema,
  matchingPayloadSchema,
  multiChoicePayloadSchema,
  numericPayloadSchema,
  questionSchema,
  trueFalsePayloadSchema,
  typeAnswerPayloadSchema,
} from '../schemas.js'

describe('@molecule/api-quiz-grading', () => {
  // ---------------------------------------------------------------------
  // normalize.ts
  // ---------------------------------------------------------------------
  describe('normalizeText', () => {
    it('lowercases, trims, collapses whitespace, and accent-folds by default', () => {
      expect(normalizeText('  Café   au  lait  ')).toBe('cafe au lait')
    })

    it('respects caseInsensitive=false', () => {
      expect(normalizeText('Foo', { caseInsensitive: false })).toBe('Foo')
    })

    it('respects trim=false', () => {
      expect(normalizeText('  foo  ', { trim: false })).toBe(' foo ')
    })

    it('respects collapseWhitespace=false', () => {
      expect(normalizeText('a   b', { collapseWhitespace: false })).toBe('a   b')
    })

    it('respects accentFold=false', () => {
      expect(normalizeText('café', { accentFold: false })).toBe('café')
    })

    it('handles empty strings', () => {
      expect(normalizeText('')).toBe('')
    })
  })

  describe('editDistance', () => {
    it('returns 0 for identical strings', () => {
      expect(editDistance('hello', 'hello')).toBe(0)
    })

    it('returns length when one string is empty', () => {
      expect(editDistance('', 'abc')).toBe(3)
      expect(editDistance('abc', '')).toBe(3)
    })

    it('measures single substitutions', () => {
      expect(editDistance('cat', 'bat')).toBe(1)
    })

    it('measures insertions and deletions', () => {
      expect(editDistance('kitten', 'sitting')).toBe(3)
    })

    it('is symmetric', () => {
      expect(editDistance('abc', 'xyz')).toBe(editDistance('xyz', 'abc'))
    })

    it('handles long strings', () => {
      expect(editDistance('a'.repeat(50), 'a'.repeat(50))).toBe(0)
      expect(editDistance('a'.repeat(50), 'b'.repeat(50))).toBe(50)
    })
  })

  // ---------------------------------------------------------------------
  // multi-choice
  // ---------------------------------------------------------------------
  describe('gradeMultiChoice', () => {
    describe('single-correct', () => {
      it('awards full credit when the one correct option is selected', () => {
        const r = gradeMultiChoice({ correctIndices: [2], optionCount: 4 }, [2])
        expect(r).toEqual({ isCorrect: true, fraction: 1, explanation: 'correct' })
      })

      it('rejects an empty selection', () => {
        const r = gradeMultiChoice({ correctIndices: [2], optionCount: 4 }, [])
        expect(r.isCorrect).toBe(false)
        expect(r.fraction).toBe(0)
      })

      it('rejects the wrong selection', () => {
        const r = gradeMultiChoice({ correctIndices: [2], optionCount: 4 }, [0])
        expect(r.isCorrect).toBe(false)
        expect(r.fraction).toBe(0)
      })

      it('rejects extra-correct selections without partial credit', () => {
        const r = gradeMultiChoice({ correctIndices: [2], optionCount: 4 }, [2, 0])
        expect(r.isCorrect).toBe(false)
        expect(r.fraction).toBe(0)
      })
    })

    describe('multi-correct (no partial)', () => {
      it('awards full credit only when the sets match exactly', () => {
        const payload = { correctIndices: [0, 2], optionCount: 4 }
        expect(gradeMultiChoice(payload, [0, 2]).isCorrect).toBe(true)
        expect(gradeMultiChoice(payload, [2, 0]).isCorrect).toBe(true) // order-insensitive
      })

      it('rejects partial selections', () => {
        const payload = { correctIndices: [0, 2], optionCount: 4 }
        expect(gradeMultiChoice(payload, [0]).fraction).toBe(0)
      })

      it('rejects superset selections', () => {
        const payload = { correctIndices: [0, 2], optionCount: 4 }
        expect(gradeMultiChoice(payload, [0, 1, 2]).fraction).toBe(0)
      })

      it('deduplicates the submitted answer', () => {
        const r = gradeMultiChoice({ correctIndices: [0, 2], optionCount: 4 }, [0, 0, 2, 2])
        expect(r.isCorrect).toBe(true)
      })

      it('ignores out-of-range indices', () => {
        const r = gradeMultiChoice({ correctIndices: [0, 2], optionCount: 4 }, [0, 2, 99, -1])
        expect(r.isCorrect).toBe(true)
      })
    })

    describe('multi-correct (partial credit)', () => {
      const payload = { correctIndices: [0, 1, 2], optionCount: 5, allowPartial: true }

      it('awards proportional credit for some-but-not-all correct picks', () => {
        const r = gradeMultiChoice(payload, [0, 1])
        expect(r.isCorrect).toBe(false)
        expect(r.fraction).toBeCloseTo(2 / 3)
        expect(r.explanation).toBe('partial')
      })

      it('penalises wrong picks against the wrong-pool denominator', () => {
        // 1 correct (1/3), 1 wrong (1/2 of 2 wrong options) ⇒ 1/3 - 1/2 = max(0, -1/6) = 0
        const r = gradeMultiChoice(payload, [0, 3])
        expect(r.fraction).toBe(0)
      })

      it('still awards full credit when the set matches', () => {
        expect(gradeMultiChoice(payload, [0, 1, 2]).isCorrect).toBe(true)
      })

      it('floors negative net at zero', () => {
        // No correct picks, two wrong ⇒ 0 - 2/2 < 0 ⇒ 0
        const r = gradeMultiChoice(payload, [3, 4])
        expect(r.fraction).toBe(0)
      })
    })
  })

  // ---------------------------------------------------------------------
  // true-false
  // ---------------------------------------------------------------------
  describe('gradeTrueFalse', () => {
    it('awards full credit on match', () => {
      expect(gradeTrueFalse({ correct: true }, true).isCorrect).toBe(true)
      expect(gradeTrueFalse({ correct: false }, false).isCorrect).toBe(true)
    })

    it('rejects mismatches', () => {
      expect(gradeTrueFalse({ correct: true }, false).fraction).toBe(0)
      expect(gradeTrueFalse({ correct: false }, true).fraction).toBe(0)
    })
  })

  // ---------------------------------------------------------------------
  // type-answer
  // ---------------------------------------------------------------------
  describe('gradeTypeAnswer', () => {
    it('matches case-insensitively by default', () => {
      const r = gradeTypeAnswer({ acceptedAnswers: ['Paris'] }, 'paris')
      expect(r.isCorrect).toBe(true)
    })

    it('trims and collapses whitespace by default', () => {
      const r = gradeTypeAnswer({ acceptedAnswers: ['Paris'] }, '  Paris   ')
      expect(r.isCorrect).toBe(true)
    })

    it('accent-folds by default', () => {
      const r = gradeTypeAnswer({ acceptedAnswers: ['café'] }, 'cafe')
      expect(r.isCorrect).toBe(true)
    })

    it('accepts any of the listed accepted answers', () => {
      const r = gradeTypeAnswer({ acceptedAnswers: ['colour', 'color'] }, 'color')
      expect(r.isCorrect).toBe(true)
    })

    it('rejects non-matches without fuzzy', () => {
      const r = gradeTypeAnswer({ acceptedAnswers: ['Paris'] }, 'Pariz')
      expect(r.fraction).toBe(0)
    })

    it('rejects empty submissions', () => {
      expect(gradeTypeAnswer({ acceptedAnswers: ['x'] }, '').fraction).toBe(0)
      expect(gradeTypeAnswer({ acceptedAnswers: ['x'] }, '   ').fraction).toBe(0)
    })

    it('accepts within edit-distance threshold when fuzzy is enabled', () => {
      const r = gradeTypeAnswer(
        { acceptedAnswers: ['Paris'], match: { maxEditDistance: 1 } },
        'Pariz',
      )
      expect(r.isCorrect).toBe(true)
      expect(r.explanation).toBe('correct.fuzzy')
    })

    it('still prefers exact match over fuzzy match (explanation = correct)', () => {
      const r = gradeTypeAnswer(
        { acceptedAnswers: ['Paris'], match: { maxEditDistance: 2 } },
        'paris',
      )
      expect(r.explanation).toBe('correct')
    })

    it('rejects beyond edit-distance threshold', () => {
      const r = gradeTypeAnswer(
        { acceptedAnswers: ['Paris'], match: { maxEditDistance: 1 } },
        'Berlin',
      )
      expect(r.fraction).toBe(0)
    })

    it('respects strict (case-sensitive, no accent-fold) options', () => {
      const r = gradeTypeAnswer(
        { acceptedAnswers: ['Paris'], match: { caseInsensitive: false, accentFold: false } },
        'paris',
      )
      expect(r.fraction).toBe(0)
    })
  })

  // ---------------------------------------------------------------------
  // fill-blank
  // ---------------------------------------------------------------------
  describe('gradeFillBlank', () => {
    const payload = {
      blanks: [{ acceptedAnswers: ['cat'] }, { acceptedAnswers: ['dog', 'puppy'] }],
    }

    it('awards full credit when every blank matches', () => {
      const r = gradeFillBlank(payload, ['CAT', 'puppy'])
      expect(r).toEqual({ isCorrect: true, fraction: 1, explanation: 'correct' })
    })

    it('awards proportional credit by default', () => {
      const r = gradeFillBlank(payload, ['cat', 'wrong'])
      expect(r.isCorrect).toBe(false)
      expect(r.fraction).toBe(0.5)
      expect(r.explanation).toBe('partial')
    })

    it('returns zero when no blank matches', () => {
      const r = gradeFillBlank(payload, ['x', 'y'])
      expect(r.fraction).toBe(0)
    })

    it('returns zero with allowPartial=false unless all match', () => {
      const r = gradeFillBlank({ ...payload, allowPartial: false }, ['cat', 'wrong'])
      expect(r.fraction).toBe(0)
    })

    it('returns full credit with allowPartial=false when all match', () => {
      const r = gradeFillBlank({ ...payload, allowPartial: false }, ['cat', 'dog'])
      expect(r.isCorrect).toBe(true)
    })

    it('treats missing answers as wrong', () => {
      const r = gradeFillBlank(payload, ['cat'])
      expect(r.fraction).toBe(0.5)
    })

    it('handles zero-blank payloads as trivially correct', () => {
      const r = gradeFillBlank({ blanks: [] }, [])
      expect(r.isCorrect).toBe(true)
    })

    it('honours custom match options', () => {
      const r = gradeFillBlank(
        { blanks: [{ acceptedAnswers: ['Paris'] }], match: { caseInsensitive: false } },
        ['paris'],
      )
      expect(r.fraction).toBe(0)
    })
  })

  // ---------------------------------------------------------------------
  // numeric
  // ---------------------------------------------------------------------
  describe('gradeNumeric', () => {
    it('awards full credit on exact match with zero tolerance', () => {
      expect(gradeNumeric({ correct: 42 }, 42).isCorrect).toBe(true)
    })

    it('rejects exact-mismatch with zero tolerance', () => {
      expect(gradeNumeric({ correct: 42 }, 41.999).fraction).toBe(0)
    })

    it('accepts answers within tolerance', () => {
      expect(gradeNumeric({ correct: 100, tolerance: 0.5 }, 100.5).isCorrect).toBe(true)
      expect(gradeNumeric({ correct: 100, tolerance: 0.5 }, 99.5).isCorrect).toBe(true)
    })

    it('rejects answers outside tolerance', () => {
      const r = gradeNumeric({ correct: 100, tolerance: 0.5 }, 101)
      expect(r.fraction).toBe(0)
      expect(r.explanation).toBe('numeric.outOfTolerance')
    })

    it('rejects non-finite submissions', () => {
      const r = gradeNumeric({ correct: 0 }, Number.NaN)
      expect(r.explanation).toBe('numeric.invalid')
    })

    it('handles negative numbers', () => {
      expect(gradeNumeric({ correct: -5, tolerance: 0.1 }, -5.05).isCorrect).toBe(true)
    })
  })

  // ---------------------------------------------------------------------
  // matching
  // ---------------------------------------------------------------------
  describe('gradeMatching', () => {
    const payload = { pairs: { a: '1', b: '2', c: '3' } }

    it('awards full credit when all pairs match', () => {
      const r = gradeMatching(payload, { a: '1', b: '2', c: '3' })
      expect(r.isCorrect).toBe(true)
    })

    it('awards proportional credit by default', () => {
      const r = gradeMatching(payload, { a: '1', b: '2', c: 'wrong' })
      expect(r.fraction).toBeCloseTo(2 / 3)
      expect(r.explanation).toBe('partial')
    })

    it('returns zero when no pair matches', () => {
      const r = gradeMatching(payload, { a: 'x', b: 'y', c: 'z' })
      expect(r.fraction).toBe(0)
    })

    it('returns zero with allowPartial=false unless all match', () => {
      const r = gradeMatching({ ...payload, allowPartial: false }, { a: '1', b: '2', c: 'wrong' })
      expect(r.fraction).toBe(0)
    })

    it('handles empty pair maps as trivially correct', () => {
      const r = gradeMatching({ pairs: {} }, {})
      expect(r.isCorrect).toBe(true)
    })

    it('handles missing keys', () => {
      // @ts-expect-error — partial answer to confirm the grader is defensive.
      const r = gradeMatching(payload, { a: '1' })
      expect(r.fraction).toBeCloseTo(1 / 3)
    })
  })

  // ---------------------------------------------------------------------
  // engine.gradeAnswer (dispatch + speed bonus + points scaling)
  // ---------------------------------------------------------------------
  describe('computeSpeedFactor', () => {
    it('returns 1 when no time data is provided', () => {
      expect(computeSpeedFactor(undefined, 1000, 0.5)).toBe(1)
      expect(computeSpeedFactor(500, undefined, 0.5)).toBe(1)
    })

    it('returns 1 + maxFactor for instant answers', () => {
      expect(computeSpeedFactor(0, 1000, 0.5)).toBe(1.5)
    })

    it('returns 1 for over-budget answers', () => {
      expect(computeSpeedFactor(2000, 1000, 0.5)).toBe(1)
    })

    it('scales linearly between', () => {
      expect(computeSpeedFactor(500, 1000, 0.5)).toBeCloseTo(1.25)
    })

    it('returns 1 when timeLimit is non-positive', () => {
      expect(computeSpeedFactor(0, 0, 0.5)).toBe(1)
      expect(computeSpeedFactor(0, -1, 0.5)).toBe(1)
    })

    it('returns 1 when maxFactor is zero', () => {
      expect(computeSpeedFactor(0, 1000, 0)).toBe(1)
    })
  })

  describe('gradeAnswer (dispatch + scoring)', () => {
    it('multiplies fraction by points', () => {
      const r = gradeAnswer(
        {
          kind: 'multi-choice',
          payload: { correctIndices: [0, 1, 2], optionCount: 5, allowPartial: true },
          points: 10,
        },
        [0, 1],
      )
      expect(r.points_earned).toBeCloseTo(10 * (2 / 3))
      expect(r.is_correct).toBe(false)
      expect(r.explanation).toBe('partial')
    })

    it('defaults points to 1', () => {
      const r = gradeAnswer({ kind: 'true-false', payload: { correct: true } }, true)
      expect(r.points_earned).toBe(1)
    })

    it('applies speed bonus on full-credit answers', () => {
      const r = gradeAnswer(
        {
          kind: 'true-false',
          payload: { correct: true },
          points: 10,
          timeLimitMs: 1000,
        },
        true,
        { elapsedMs: 0 },
      )
      expect(r.points_earned).toBeCloseTo(15)
    })

    it('does not apply speed bonus to zero-credit answers', () => {
      const r = gradeAnswer(
        {
          kind: 'true-false',
          payload: { correct: true },
          points: 10,
          timeLimitMs: 1000,
        },
        false,
        { elapsedMs: 0 },
      )
      expect(r.points_earned).toBe(0)
    })

    it('scales speed bonus on partial-credit answers', () => {
      const r = gradeAnswer(
        {
          kind: 'fill-blank',
          payload: { blanks: [{ acceptedAnswers: ['a'] }, { acceptedAnswers: ['b'] }] },
          points: 10,
          timeLimitMs: 1000,
        },
        ['a', 'wrong'],
        { elapsedMs: 500 },
      )
      // half credit (5) × 1.25 speed factor = 6.25
      expect(r.points_earned).toBeCloseTo(6.25)
    })

    it('respects custom speedBonusMaxFactor', () => {
      const r = gradeAnswer(
        {
          kind: 'true-false',
          payload: { correct: true },
          points: 10,
          timeLimitMs: 1000,
        },
        true,
        { elapsedMs: 0, speedBonusMaxFactor: 1 },
      )
      expect(r.points_earned).toBeCloseTo(20)
    })

    it('routes type-answer questions through the type-answer grader', () => {
      const r = gradeAnswer(
        {
          kind: 'type-answer',
          payload: { acceptedAnswers: ['Paris'], match: { maxEditDistance: 1 } },
          points: 5,
        },
        'Pariz',
      )
      expect(r.is_correct).toBe(true)
      expect(r.points_earned).toBe(5)
    })

    it('routes numeric questions through the numeric grader', () => {
      const r = gradeAnswer(
        { kind: 'numeric', payload: { correct: 3.14, tolerance: 0.01 }, points: 4 },
        3.141,
      )
      expect(r.is_correct).toBe(true)
      expect(r.points_earned).toBe(4)
    })

    it('routes matching questions through the matching grader', () => {
      const r = gradeAnswer(
        {
          kind: 'matching',
          payload: { pairs: { a: '1', b: '2' } },
          points: 6,
        },
        { a: '1', b: '2' },
      )
      expect(r.is_correct).toBe(true)
      expect(r.points_earned).toBe(6)
    })
  })

  // ---------------------------------------------------------------------
  // schemas
  // ---------------------------------------------------------------------
  describe('Zod schemas', () => {
    it('validates a multi-choice payload', () => {
      expect(
        multiChoicePayloadSchema.safeParse({ correctIndices: [0], optionCount: 4 }).success,
      ).toBe(true)
      expect(
        multiChoicePayloadSchema.safeParse({ correctIndices: [-1], optionCount: 4 }).success,
      ).toBe(false)
    })

    it('validates a true-false payload', () => {
      expect(trueFalsePayloadSchema.safeParse({ correct: true }).success).toBe(true)
      expect(trueFalsePayloadSchema.safeParse({ correct: 1 }).success).toBe(false)
    })

    it('validates a type-answer payload (rejects empty acceptedAnswers)', () => {
      expect(typeAnswerPayloadSchema.safeParse({ acceptedAnswers: ['x'] }).success).toBe(true)
      expect(typeAnswerPayloadSchema.safeParse({ acceptedAnswers: [] }).success).toBe(false)
    })

    it('validates a fill-blank payload', () => {
      expect(
        fillBlankPayloadSchema.safeParse({ blanks: [{ acceptedAnswers: ['a'] }] }).success,
      ).toBe(true)
      expect(fillBlankPayloadSchema.safeParse({ blanks: [] }).success).toBe(false)
    })

    it('validates a numeric payload', () => {
      expect(numericPayloadSchema.safeParse({ correct: 3.14, tolerance: 0.1 }).success).toBe(true)
      expect(numericPayloadSchema.safeParse({ correct: 3.14, tolerance: -1 }).success).toBe(false)
    })

    it('validates a matching payload', () => {
      expect(matchingPayloadSchema.safeParse({ pairs: { a: '1', b: '2' } }).success).toBe(true)
      expect(matchingPayloadSchema.safeParse({ pairs: { a: 1 } }).success).toBe(false)
    })

    it('validates a complete Question via the discriminated union', () => {
      const ok = questionSchema.safeParse({
        kind: 'multi-choice',
        payload: { correctIndices: [0], optionCount: 3 },
        points: 5,
      })
      expect(ok.success).toBe(true)
    })

    it('rejects a Question with the wrong payload-shape for its kind', () => {
      const bad = questionSchema.safeParse({
        kind: 'true-false',
        payload: { correctIndices: [0], optionCount: 3 },
      })
      expect(bad.success).toBe(false)
    })

    it('rejects an unknown kind', () => {
      const bad = questionSchema.safeParse({
        kind: 'essay',
        payload: {},
      })
      expect(bad.success).toBe(false)
    })
  })
})
