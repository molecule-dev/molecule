import { describe, expect, it } from 'vitest'

import {
  gradeFillBlank,
  gradeMatching,
  gradeMultiChoice,
  gradeNumeric,
  gradeTrueFalse,
  gradeTypeAnswer,
} from '../graders.js'

describe('gradeMultiChoice', () => {
  it('returns FULL on exact single-correct match', () => {
    const out = gradeMultiChoice({ correctIndices: [2], optionCount: 4 }, [2])
    expect(out).toEqual({ isCorrect: true, fraction: 1, explanation: 'correct' })
  })

  it('returns ZERO when missing a correct option (no partial)', () => {
    const out = gradeMultiChoice(
      { correctIndices: [1, 3], optionCount: 4, allowPartial: false },
      [1],
    )
    expect(out.fraction).toBe(0)
    expect(out.isCorrect).toBe(false)
  })

  it('returns ZERO when including an incorrect option (no partial)', () => {
    const out = gradeMultiChoice(
      { correctIndices: [1], optionCount: 4, allowPartial: false },
      [1, 2],
    )
    expect(out.fraction).toBe(0)
  })

  it('returns FULL when selecting EXACTLY the correct multi-select set', () => {
    const out = gradeMultiChoice({ correctIndices: [0, 2], optionCount: 4 }, [0, 2])
    expect(out.isCorrect).toBe(true)
    expect(out.fraction).toBe(1)
  })

  it('partial credit: half the correct + no wrong → 0.5', () => {
    const out = gradeMultiChoice(
      { correctIndices: [0, 1, 2, 3], optionCount: 5, allowPartial: true },
      [0, 1],
    )
    expect(out.fraction).toBeCloseTo(0.5)
    expect(out.explanation).toBe('partial')
  })

  it('partial credit: incorrect selections deduct from positive', () => {
    // 2 of 2 correct, 1 of 2 wrong-options selected.
    // positive = 2/2 = 1; negative = 1/2 = 0.5; fraction = max(0, 1-0.5) = 0.5
    const out = gradeMultiChoice(
      { correctIndices: [0, 1], optionCount: 4, allowPartial: true },
      [0, 1, 2],
    )
    expect(out.fraction).toBeCloseTo(0.5)
  })

  it('partial credit floored at zero: more wrong than right → 0', () => {
    const out = gradeMultiChoice(
      { correctIndices: [0], optionCount: 5, allowPartial: true },
      [1, 2, 3, 4], // 0 correct, 4 wrong
    )
    expect(out.fraction).toBe(0)
  })

  it('ignores duplicate selections (treats answers as a set)', () => {
    const out = gradeMultiChoice({ correctIndices: [2], optionCount: 4 }, [2, 2, 2])
    expect(out.isCorrect).toBe(true)
  })

  it('ignores out-of-range and non-integer answers', () => {
    const out = gradeMultiChoice({ correctIndices: [1], optionCount: 4 }, [
      1, 99, -3, 1.5,
    ] as number[])
    expect(out.isCorrect).toBe(true) // only 1 was valid; matches
  })
})

describe('gradeTrueFalse', () => {
  it('FULL on matching boolean', () => {
    expect(gradeTrueFalse({ correct: true }, true).fraction).toBe(1)
    expect(gradeTrueFalse({ correct: false }, false).fraction).toBe(1)
  })

  it('ZERO on mismatched boolean', () => {
    expect(gradeTrueFalse({ correct: true }, false).fraction).toBe(0)
    expect(gradeTrueFalse({ correct: false }, true).fraction).toBe(0)
  })
})

describe('gradeTypeAnswer', () => {
  it('FULL on exact match', () => {
    expect(gradeTypeAnswer({ acceptedAnswers: ['hello'] }, 'hello').isCorrect).toBe(true)
  })

  it('default normalisation makes match case + accent + whitespace insensitive', () => {
    expect(gradeTypeAnswer({ acceptedAnswers: ['Café'] }, '   cafe   ').isCorrect).toBe(true)
  })

  it('ZERO when answer is empty', () => {
    expect(gradeTypeAnswer({ acceptedAnswers: ['x'] }, '').fraction).toBe(0)
    expect(gradeTypeAnswer({ acceptedAnswers: ['x'] }, '   ').fraction).toBe(0)
  })

  it('ZERO when no candidate matches', () => {
    expect(gradeTypeAnswer({ acceptedAnswers: ['hello'] }, 'goodbye').fraction).toBe(0)
  })

  it('accepts ANY of multiple acceptedAnswers', () => {
    expect(gradeTypeAnswer({ acceptedAnswers: ['hi', 'hello', 'hey'] }, 'hey').isCorrect).toBe(true)
  })

  it('fuzzy match: edit distance within threshold → correct.fuzzy', () => {
    const out = gradeTypeAnswer(
      { acceptedAnswers: ['mitochondria'], match: { maxEditDistance: 2 } },
      'mitochondira', // 2 char transposition
    )
    expect(out.isCorrect).toBe(true)
    expect(out.explanation).toBe('correct.fuzzy')
  })

  it('fuzzy match beyond threshold → ZERO', () => {
    const out = gradeTypeAnswer(
      { acceptedAnswers: ['mitochondria'], match: { maxEditDistance: 1 } },
      'mitochondras', // distance 2
    )
    expect(out.fraction).toBe(0)
  })

  it('exact normalised match takes precedence over fuzzy (FULL not correct.fuzzy)', () => {
    const out = gradeTypeAnswer(
      { acceptedAnswers: ['hello'], match: { maxEditDistance: 5 } },
      'HELLO',
    )
    expect(out.explanation).toBe('correct') // exact, not 'correct.fuzzy'
  })
})

describe('gradeFillBlank', () => {
  it('FULL when no blanks', () => {
    expect(gradeFillBlank({ blanks: [] }, []).isCorrect).toBe(true)
  })

  it('FULL when every blank matches', () => {
    const out = gradeFillBlank(
      {
        blanks: [{ acceptedAnswers: ['cat'] }, { acceptedAnswers: ['dog'] }],
      },
      ['cat', 'dog'],
    )
    expect(out.isCorrect).toBe(true)
  })

  it('ZERO when no blanks match', () => {
    const out = gradeFillBlank(
      { blanks: [{ acceptedAnswers: ['cat'] }, { acceptedAnswers: ['dog'] }] },
      ['hippo', 'rhino'],
    )
    expect(out.fraction).toBe(0)
  })

  it('partial credit (default) → fraction = correct / total', () => {
    const out = gradeFillBlank(
      {
        blanks: [
          { acceptedAnswers: ['a'] },
          { acceptedAnswers: ['b'] },
          { acceptedAnswers: ['c'] },
        ],
      },
      ['a', 'b', 'WRONG'],
    )
    expect(out.fraction).toBeCloseTo(2 / 3)
    expect(out.explanation).toBe('partial')
  })

  it('ZERO when allowPartial=false and not all correct', () => {
    const out = gradeFillBlank(
      {
        blanks: [{ acceptedAnswers: ['a'] }, { acceptedAnswers: ['b'] }],
        allowPartial: false,
      },
      ['a', 'WRONG'],
    )
    expect(out.fraction).toBe(0)
  })

  it('empty blank answer counts as wrong (not auto-correct)', () => {
    const out = gradeFillBlank(
      { blanks: [{ acceptedAnswers: ['x'] }, { acceptedAnswers: ['y'] }] },
      ['x', ''], // 2nd blank empty
    )
    expect(out.fraction).toBeCloseTo(0.5)
  })

  it('missing array slot (undefined answer) counts as wrong', () => {
    const out = gradeFillBlank(
      { blanks: [{ acceptedAnswers: ['x'] }, { acceptedAnswers: ['y'] }] },
      ['x'], // 2nd answer missing
    )
    expect(out.fraction).toBeCloseTo(0.5)
  })
})

describe('gradeNumeric', () => {
  it('FULL on exact match', () => {
    expect(gradeNumeric({ correct: 42 }, 42).isCorrect).toBe(true)
  })

  it('FULL within tolerance', () => {
    expect(gradeNumeric({ correct: 100, tolerance: 5 }, 103).isCorrect).toBe(true)
    expect(gradeNumeric({ correct: 100, tolerance: 5 }, 95).isCorrect).toBe(true)
  })

  it('FULL at exact tolerance boundary (<=)', () => {
    expect(gradeNumeric({ correct: 100, tolerance: 5 }, 105).isCorrect).toBe(true)
  })

  it('ZERO just outside tolerance', () => {
    expect(gradeNumeric({ correct: 100, tolerance: 5 }, 106).fraction).toBe(0)
  })

  it('ZERO + numeric.invalid for non-finite answer', () => {
    expect(gradeNumeric({ correct: 1 }, Number.NaN).explanation).toBe('numeric.invalid')
    expect(gradeNumeric({ correct: 1 }, Number.POSITIVE_INFINITY).explanation).toBe(
      'numeric.invalid',
    )
  })

  it('ZERO + numeric.invalid for non-number runtime input (TS-bypassed)', () => {
    // Simulates a bad caller passing a string; runtime check catches it.
    expect(gradeNumeric({ correct: 1 }, 'foo' as unknown as number).explanation).toBe(
      'numeric.invalid',
    )
  })
})

describe('gradeMatching', () => {
  it('FULL when expected has zero pairs', () => {
    expect(gradeMatching({ pairs: {} }, {}).isCorrect).toBe(true)
  })

  it('FULL when every pair matches', () => {
    expect(gradeMatching({ pairs: { a: '1', b: '2' } }, { a: '1', b: '2' }).isCorrect).toBe(true)
  })

  it('ZERO when no pairs match', () => {
    expect(gradeMatching({ pairs: { a: '1', b: '2' } }, { a: 'X', b: 'Y' }).fraction).toBe(0)
  })

  it('partial credit (default) → correct / total', () => {
    expect(
      gradeMatching({ pairs: { a: '1', b: '2', c: '3' } }, { a: '1', b: '2', c: 'X' }).fraction,
    ).toBeCloseTo(2 / 3)
  })

  it('ZERO when allowPartial=false and not all match', () => {
    const out = gradeMatching(
      { pairs: { a: '1', b: '2' }, allowPartial: false },
      { a: '1', b: 'X' },
    )
    expect(out.fraction).toBe(0)
  })

  it('missing left-id in answer does not throw', () => {
    const out = gradeMatching({ pairs: { a: '1', b: '2' } }, { a: '1' })
    expect(out.fraction).toBeCloseTo(0.5)
  })
})
