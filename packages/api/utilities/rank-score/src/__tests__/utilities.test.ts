import { describe, expect, it } from 'vitest'

import { hoursBetween, sign, toEpochMs } from '../utilities.js'

describe('toEpochMs', () => {
  it('accepts a Date and returns its getTime()', () => {
    const date = new Date('2026-05-13T10:00:00Z')
    expect(toEpochMs(date)).toBe(date.getTime())
  })

  it('passes through numeric epoch-ms values unchanged', () => {
    expect(toEpochMs(123456789)).toBe(123456789)
  })

  it('parses ISO 8601 strings', () => {
    expect(toEpochMs('2026-05-13T10:00:00Z')).toBe(Date.UTC(2026, 4, 13, 10, 0, 0))
  })

  it('accepts 0 (epoch start)', () => {
    expect(toEpochMs(0)).toBe(0)
  })

  it('accepts negative epoch ms (pre-1970 dates)', () => {
    expect(toEpochMs(-1000)).toBe(-1000)
  })

  it('throws TypeError for non-finite numeric input', () => {
    expect(() => toEpochMs(Number.NaN)).toThrow(TypeError)
    expect(() => toEpochMs(Number.POSITIVE_INFINITY)).toThrow(TypeError)
  })

  it('throws TypeError for unparseable string', () => {
    expect(() => toEpochMs('not a date')).toThrow(/invalid timestamp/)
  })

  it('throws TypeError for invalid Date instance', () => {
    expect(() => toEpochMs(new Date('not-a-date'))).toThrow(/invalid timestamp/)
  })

  it('throws TypeError with the original value in the error message', () => {
    expect(() => toEpochMs('garbage')).toThrow(/garbage/)
  })
})

describe('hoursBetween', () => {
  const HOUR_MS = 3_600_000

  it('returns 0 when then === now', () => {
    expect(hoursBetween(1000, 1000)).toBe(0)
  })

  it('returns positive hours when then is earlier than now', () => {
    expect(hoursBetween(0, HOUR_MS)).toBe(1)
    expect(hoursBetween(0, 24 * HOUR_MS)).toBe(24)
  })

  it('returns negative hours when then is in the future', () => {
    expect(hoursBetween(HOUR_MS, 0)).toBe(-1)
  })

  it('returns fractional hours for sub-hour gaps', () => {
    expect(hoursBetween(0, HOUR_MS / 2)).toBe(0.5)
    expect(hoursBetween(0, HOUR_MS / 4)).toBe(0.25)
  })
})

describe('sign', () => {
  it('returns 1 for positive numbers', () => {
    expect(sign(0.001)).toBe(1)
    expect(sign(42)).toBe(1)
    expect(sign(Number.MAX_SAFE_INTEGER)).toBe(1)
  })

  it('returns -1 for negative numbers', () => {
    expect(sign(-0.001)).toBe(-1)
    expect(sign(-42)).toBe(-1)
    expect(sign(Number.MIN_SAFE_INTEGER)).toBe(-1)
  })

  it('returns 0 for positive and negative zero (no -0/+0 ambiguity)', () => {
    expect(sign(0)).toBe(0)
    expect(sign(-0)).toBe(0)
    // Critical: returning -1 for -0 would break sort comparators.
    expect(Object.is(sign(-0), 0)).toBe(true)
  })

  it('return type is the discriminated union -1 | 0 | 1 (verified at runtime)', () => {
    const values = [sign(1), sign(-1), sign(0)]
    for (const v of values) {
      expect([-1, 0, 1]).toContain(v)
    }
  })
})
