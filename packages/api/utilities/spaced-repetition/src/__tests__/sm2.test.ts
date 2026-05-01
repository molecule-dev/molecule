import { describe, expect, it } from 'vitest'

import { DEFAULT_EASE_FACTOR, initialSm2State, MIN_EASE_FACTOR, reviewSm2 } from '../sm2.js'
import type { SpacedRepetitionState } from '../types.js'

const MS_PER_DAY = 24 * 60 * 60 * 1000

const NOW = new Date('2026-05-01T12:00:00Z')

function makeState(overrides: Partial<SpacedRepetitionState> = {}): SpacedRepetitionState {
  return {
    ease_factor: DEFAULT_EASE_FACTOR,
    interval_days: 0,
    repetitions: 0,
    lapses: 0,
    next_review: new Date(NOW.getTime()),
    ...overrides,
  }
}

describe('initialSm2State', () => {
  it('starts with ease_factor 2.5, zero reps/lapses, interval 0, due now', () => {
    const state = initialSm2State(NOW)
    expect(state.ease_factor).toBe(DEFAULT_EASE_FACTOR)
    expect(state.interval_days).toBe(0)
    expect(state.repetitions).toBe(0)
    expect(state.lapses).toBe(0)
    expect(state.next_review.getTime()).toBe(NOW.getTime())
  })

  it('defaults `now` to current time when omitted', () => {
    const before = Date.now()
    const state = initialSm2State()
    const after = Date.now()
    expect(state.next_review.getTime()).toBeGreaterThanOrEqual(before)
    expect(state.next_review.getTime()).toBeLessThanOrEqual(after)
  })
})

describe('reviewSm2 — first review (repetitions: 0 → 1)', () => {
  it('grade 5 → interval 1 day, repetitions 1, lapses unchanged', () => {
    const state = reviewSm2(makeState(), 5, { now: NOW })
    expect(state.interval_days).toBe(1)
    expect(state.repetitions).toBe(1)
    expect(state.lapses).toBe(0)
    expect(state.next_review.getTime()).toBe(NOW.getTime() + MS_PER_DAY)
  })

  it('grade 3 (just-passed) → interval 1 day, repetitions 1', () => {
    const state = reviewSm2(makeState(), 3, { now: NOW })
    expect(state.interval_days).toBe(1)
    expect(state.repetitions).toBe(1)
  })
})

describe('reviewSm2 — second review (repetitions: 1 → 2)', () => {
  it('grade 5 after one prior success → interval 6 days', () => {
    const after1st = reviewSm2(makeState(), 5, { now: NOW })
    const after2nd = reviewSm2(after1st, 5, {
      now: new Date(NOW.getTime() + MS_PER_DAY),
    })
    expect(after2nd.interval_days).toBe(6)
    expect(after2nd.repetitions).toBe(2)
  })
})

describe('reviewSm2 — mature card (repetitions: 2 → 3+)', () => {
  it('multiplies prior interval by the (updated) ease factor and rounds', () => {
    // After two perfect reviews, EF stays at 2.5 + 0.1 each → clamped/raised
    // by formula. Starting from EF=2.5, interval=6, grade=5:
    // EF' = 2.5 + (0.1 - 0 * (0.08 + 0)) = 2.6
    // interval = round(6 * 2.6) = 16
    const mature = makeState({
      ease_factor: 2.5,
      interval_days: 6,
      repetitions: 2,
    })
    const state = reviewSm2(mature, 5, { now: NOW })
    expect(state.ease_factor).toBeCloseTo(2.6, 10)
    expect(state.interval_days).toBe(16)
    expect(state.repetitions).toBe(3)
    expect(state.next_review.getTime()).toBe(NOW.getTime() + 16 * MS_PER_DAY)
  })

  it('further successful reviews keep growing the interval', () => {
    let state = makeState({
      ease_factor: 2.6,
      interval_days: 16,
      repetitions: 3,
    })
    // grade 5: EF' = 2.6 + 0.1 = 2.7, interval = round(16 * 2.7) = 43
    state = reviewSm2(state, 5, { now: NOW })
    expect(state.interval_days).toBe(43)
    expect(state.ease_factor).toBeCloseTo(2.7, 10)
  })
})

describe('reviewSm2 — failure (grade < 3)', () => {
  it.each([0, 1, 2] as const)(
    'grade %i resets repetitions to 0, interval to 1, increments lapses',
    (grade) => {
      const mature = makeState({
        ease_factor: 2.6,
        interval_days: 35,
        repetitions: 5,
        lapses: 1,
      })
      const state = reviewSm2(mature, grade, { now: NOW })
      expect(state.repetitions).toBe(0)
      expect(state.interval_days).toBe(1)
      expect(state.lapses).toBe(2)
      expect(state.next_review.getTime()).toBe(NOW.getTime() + MS_PER_DAY)
    },
  )

  it('still applies the ease-factor formula on failure', () => {
    // Starting EF=2.5, grade=0:
    // EF' = max(1.3, 2.5 + (0.1 - 5 * (0.08 + 5 * 0.02)))
    //     = max(1.3, 2.5 + (0.1 - 5 * 0.18))
    //     = max(1.3, 2.5 - 0.8) = 1.7
    const state = reviewSm2(makeState(), 0, { now: NOW })
    expect(state.ease_factor).toBeCloseTo(1.7, 10)
  })
})

describe('reviewSm2 — ease-factor floor at 1.3', () => {
  it('clamps EF to 1.3 even when the formula would go lower', () => {
    // Repeatedly grade 0 from a low EF should not drop below 1.3.
    let state = makeState({ ease_factor: 1.4 })
    for (let i = 0; i < 5; i += 1) {
      state = reviewSm2(state, 0, { now: NOW })
    }
    expect(state.ease_factor).toBe(MIN_EASE_FACTOR)
  })

  it('does not push EF below 1.3 from a single hard failure', () => {
    const state = reviewSm2(makeState({ ease_factor: 1.35 }), 0, { now: NOW })
    expect(state.ease_factor).toBe(MIN_EASE_FACTOR)
  })
})

describe('reviewSm2 — does not mutate input', () => {
  it('returns a new object; original state is unchanged', () => {
    const original = makeState({ repetitions: 2, interval_days: 6 })
    const snapshot = { ...original, next_review: new Date(original.next_review) }
    reviewSm2(original, 5, { now: NOW })
    expect(original).toEqual(snapshot)
  })
})

describe('reviewSm2 — due-date computation across timezone boundaries', () => {
  it('produces an exact 24h offset regardless of the host timezone', () => {
    // Pick a moment near a DST transition + a non-UTC-midnight time
    // so any accidental "calendar-day add" bug would manifest as a
    // 23h or 25h offset.
    const dstish = new Date('2026-03-08T07:30:00Z') // around US "spring forward"
    const state = reviewSm2(makeState(), 5, { now: dstish })
    expect(state.next_review.getTime() - dstish.getTime()).toBe(MS_PER_DAY)
  })

  it('exact-day offset holds for multi-day mature intervals', () => {
    const start = new Date('2026-12-31T23:59:00Z') // crosses year boundary
    const mature = makeState({
      ease_factor: 2.5,
      interval_days: 6,
      repetitions: 2,
    })
    const state = reviewSm2(mature, 5, { now: start })
    // EF→2.6, interval = round(6 * 2.6) = 16 days
    expect(state.interval_days).toBe(16)
    expect(state.next_review.getTime() - start.getTime()).toBe(16 * MS_PER_DAY)
  })

  it('uses Date.now() when options.now is omitted', () => {
    const before = Date.now()
    const state = reviewSm2(makeState(), 5)
    const after = Date.now()
    // next_review = now + 1 day
    expect(state.next_review.getTime()).toBeGreaterThanOrEqual(before + MS_PER_DAY)
    expect(state.next_review.getTime()).toBeLessThanOrEqual(after + MS_PER_DAY)
  })
})

describe('reviewSm2 — Wozniak (1990) reference cases', () => {
  it('matches the canonical EF update for grade 4', () => {
    // grade 4: EF' = EF + (0.1 - 1 * (0.08 + 1 * 0.02)) = EF + 0
    const state = reviewSm2(makeState({ ease_factor: 2.5 }), 4, { now: NOW })
    expect(state.ease_factor).toBeCloseTo(2.5, 10)
  })

  it('matches the canonical EF update for grade 3', () => {
    // grade 3: EF' = EF + (0.1 - 2 * (0.08 + 2 * 0.02)) = EF - 0.14
    const state = reviewSm2(makeState({ ease_factor: 2.5 }), 3, { now: NOW })
    expect(state.ease_factor).toBeCloseTo(2.36, 10)
  })

  it('matches the canonical EF update for grade 2', () => {
    // grade 2: EF' = EF + (0.1 - 3 * (0.08 + 3 * 0.02)) = EF - 0.32
    const state = reviewSm2(makeState({ ease_factor: 2.5 }), 2, { now: NOW })
    expect(state.ease_factor).toBeCloseTo(2.18, 10)
  })
})
