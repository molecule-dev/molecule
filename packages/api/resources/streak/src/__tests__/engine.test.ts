/**
 * Pure-engine tests — no database, no I/O.
 *
 * Covers boundary conditions called out in the design note: same-day,
 * 24h, 25h, 48h, freeze-on-gap, longest tracking, idempotency, and
 * out-of-order events.
 */

import { describe, expect, it } from 'vitest'

import { computeStreakUpdate, consumeFreezeUpdate, initialState, isStale } from '../engine.js'
import type { StreakConfig, StreakState } from '../types.js'

const HOUR = 60 * 60 * 1000

const baseConfig: StreakConfig = {
  activity_kind: 'lesson',
  reset_after_hours: 24,
}

const t0 = new Date('2026-01-01T08:00:00.000Z')

function previousAt(when: Date, overrides: Partial<StreakState> = {}): StreakState {
  return {
    user_id: 'user-1',
    activity_kind: 'lesson',
    current_streak: 1,
    longest_streak: 1,
    last_activity_date: when,
    freezes_used: 0,
    ...overrides,
  }
}

describe('initialState', () => {
  it('starts current and longest at 1', () => {
    const s = initialState('user-1', 'lesson', t0)
    expect(s.current_streak).toBe(1)
    expect(s.longest_streak).toBe(1)
    expect(s.last_activity_date).toBe(t0)
    expect(s.freezes_used).toBe(0)
  })
})

describe('computeStreakUpdate — fresh user', () => {
  it('initialises to 1 when previous is null', () => {
    const result = computeStreakUpdate({ previous: null, config: baseConfig, when: t0 })
    expect(result.state.current_streak).toBe(1)
    expect(result.state.longest_streak).toBe(1)
    expect(result.reset).toBe(false)
    expect(result.freezeConsumed).toBe(false)
  })
})

describe('computeStreakUpdate — same period (idempotent)', () => {
  it('does not change counters when event is in same window', () => {
    const previous = previousAt(t0, { current_streak: 5, longest_streak: 7 })
    const next = new Date(t0.getTime() + 5 * HOUR)
    const result = computeStreakUpdate({ previous, config: baseConfig, when: next })
    expect(result.state.current_streak).toBe(5)
    expect(result.state.longest_streak).toBe(7)
    expect(result.state.last_activity_date).toEqual(next)
    expect(result.reset).toBe(false)
  })

  it('treats events <24h apart as same period (boundary)', () => {
    const previous = previousAt(t0, { current_streak: 3 })
    const next = new Date(t0.getTime() + 23 * HOUR + 59 * 60 * 1000)
    const result = computeStreakUpdate({ previous, config: baseConfig, when: next })
    expect(result.state.current_streak).toBe(3)
  })
})

describe('computeStreakUpdate — continuation', () => {
  it('increments current_streak at exactly 24h (next-period boundary)', () => {
    const previous = previousAt(t0, { current_streak: 4 })
    const next = new Date(t0.getTime() + 24 * HOUR)
    const result = computeStreakUpdate({ previous, config: baseConfig, when: next })
    expect(result.state.current_streak).toBe(5)
    expect(result.state.longest_streak).toBe(5)
  })

  it('increments at 25h (well into next window)', () => {
    const previous = previousAt(t0, { current_streak: 4 })
    const next = new Date(t0.getTime() + 25 * HOUR)
    const result = computeStreakUpdate({ previous, config: baseConfig, when: next })
    expect(result.state.current_streak).toBe(5)
  })

  it('preserves longest_streak when below it', () => {
    const previous = previousAt(t0, { current_streak: 4, longest_streak: 10 })
    const next = new Date(t0.getTime() + 24 * HOUR)
    const result = computeStreakUpdate({ previous, config: baseConfig, when: next })
    expect(result.state.current_streak).toBe(5)
    expect(result.state.longest_streak).toBe(10)
  })
})

describe('computeStreakUpdate — gap', () => {
  it('resets to 1 at 48h gap with no freeze configured', () => {
    const previous = previousAt(t0, { current_streak: 7, longest_streak: 10 })
    const next = new Date(t0.getTime() + 48 * HOUR)
    const result = computeStreakUpdate({ previous, config: baseConfig, when: next })
    expect(result.state.current_streak).toBe(1)
    expect(result.state.longest_streak).toBe(10)
    expect(result.reset).toBe(true)
    expect(result.freezeConsumed).toBe(false)
  })

  it('consumes freeze instead of resetting when one is available', () => {
    const previous = previousAt(t0, {
      current_streak: 7,
      longest_streak: 10,
      freezes_used: 0,
    })
    const next = new Date(t0.getTime() + 48 * HOUR)
    const result = computeStreakUpdate({
      previous,
      config: { ...baseConfig, freezes_per_period: 1 },
      when: next,
    })
    expect(result.state.current_streak).toBe(8)
    expect(result.state.freezes_used).toBe(1)
    expect(result.freezeConsumed).toBe(true)
    expect(result.reset).toBe(false)
  })

  it('resets after freeze cap reached', () => {
    const previous = previousAt(t0, {
      current_streak: 7,
      longest_streak: 10,
      freezes_used: 1,
    })
    const next = new Date(t0.getTime() + 48 * HOUR)
    const result = computeStreakUpdate({
      previous,
      config: { ...baseConfig, freezes_per_period: 1 },
      when: next,
    })
    expect(result.state.current_streak).toBe(1)
    expect(result.reset).toBe(true)
    expect(result.state.freezes_used).toBe(0)
  })
})

describe('computeStreakUpdate — out-of-order events', () => {
  it('ignores events older than the last activity', () => {
    const previous = previousAt(t0, { current_streak: 5 })
    const earlier = new Date(t0.getTime() - 5 * HOUR)
    const result = computeStreakUpdate({ previous, config: baseConfig, when: earlier })
    expect(result.state.current_streak).toBe(5)
    expect(result.state.last_activity_date).toEqual(t0)
    expect(result.reset).toBe(false)
  })
})

describe('consumeFreezeUpdate', () => {
  it('burns a freeze when below cap', () => {
    const previous = previousAt(t0, { current_streak: 5, freezes_used: 0 })
    const result = consumeFreezeUpdate(previous, { ...baseConfig, freezes_per_period: 2 })
    expect(result.freezeConsumed).toBe(true)
    expect(result.state.freezes_used).toBe(1)
  })

  it('no-ops at cap', () => {
    const previous = previousAt(t0, { current_streak: 5, freezes_used: 2 })
    const result = consumeFreezeUpdate(previous, { ...baseConfig, freezes_per_period: 2 })
    expect(result.freezeConsumed).toBe(false)
    expect(result.state.freezes_used).toBe(2)
  })

  it('no-ops when freezes are disabled', () => {
    const previous = previousAt(t0, { current_streak: 5 })
    const result = consumeFreezeUpdate(previous, baseConfig)
    expect(result.freezeConsumed).toBe(false)
  })
})

describe('isStale', () => {
  it('returns false when within reset window', () => {
    const state = previousAt(t0, { current_streak: 4 })
    const now = new Date(t0.getTime() + 23 * HOUR)
    expect(isStale(state, baseConfig, now)).toBe(false)
  })

  it('returns false at exact next-period boundary (24h)', () => {
    const state = previousAt(t0, { current_streak: 4 })
    const now = new Date(t0.getTime() + 24 * HOUR)
    expect(isStale(state, baseConfig, now)).toBe(false)
  })

  it('returns true after two reset windows have passed', () => {
    const state = previousAt(t0, { current_streak: 4 })
    const now = new Date(t0.getTime() + 48 * HOUR)
    expect(isStale(state, baseConfig, now)).toBe(true)
  })

  it('returns false for state with no activity', () => {
    const state = previousAt(t0, { last_activity_date: null })
    expect(isStale(state, baseConfig, new Date(t0.getTime() + 100 * HOUR))).toBe(false)
  })
})
