import { describe, expect, it } from 'vitest'

import { clampStep, defaultFormatter, defaultResetValue, keyboardNudge } from '../utilities.js'

describe('clampStep', () => {
  it('clamps below min and above max', () => {
    expect(clampStep(-200, -100, 100, 1)).toBe(-100)
    expect(clampStep(200, -100, 100, 1)).toBe(100)
  })

  it('snaps to step from min', () => {
    expect(clampStep(0.4, 0, 1, 0.1)).toBe(0.4)
    expect(clampStep(0.46, 0, 1, 0.1)).toBe(0.5)
  })

  it('handles bipolar ranges with non-integer step', () => {
    expect(clampStep(0.06, -1, 1, 0.1)).toBe(0.1)
    expect(clampStep(-0.06, -1, 1, 0.1)).toBe(-0.1)
  })

  it('returns min for non-finite input', () => {
    expect(clampStep(Number.NaN, -10, 10, 1)).toBe(-10)
  })

  it('avoids float drift in step output', () => {
    // 0.1 + 0.2 == 0.30000000000000004 — clampStep should hand back 0.3.
    expect(clampStep(0.3, 0, 1, 0.1)).toBe(0.3)
  })
})

describe('defaultResetValue', () => {
  it('returns 0 for bipolar sliders', () => {
    expect(defaultResetValue(-100, true)).toBe(0)
  })

  it('returns min for unipolar sliders', () => {
    expect(defaultResetValue(0, false)).toBe(0)
    expect(defaultResetValue(50, false)).toBe(50)
  })
})

describe('defaultFormatter', () => {
  it('appends an empty suffix when no unit is given', () => {
    expect(defaultFormatter()(42)).toBe('42')
  })

  it('appends the unit suffix', () => {
    expect(defaultFormatter('%')(42)).toBe('42%')
    expect(defaultFormatter(' dB')(-3)).toBe('-3 dB')
  })
})

describe('keyboardNudge', () => {
  it('returns step without shift', () => {
    expect(keyboardNudge(1, false)).toBe(1)
    expect(keyboardNudge(0.1, false)).toBe(0.1)
  })

  it('returns 10x step with shift', () => {
    expect(keyboardNudge(1, true)).toBe(10)
    expect(keyboardNudge(0.1, true)).toBeCloseTo(1)
  })
})
