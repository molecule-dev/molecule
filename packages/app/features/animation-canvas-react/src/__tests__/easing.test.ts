import { describe, expect, it } from 'vitest'

import { cubicBezier, easingFunctions, resolveEasing, sampleEasing } from '../easing.js'

describe('easingFunctions presets', () => {
  it('linear is the identity tuple', () => {
    expect(easingFunctions.linear).toEqual([0, 0, 1, 1])
  })

  it('exposes the standard CSS presets', () => {
    expect(easingFunctions.easeIn).toEqual([0.42, 0, 1, 1])
    expect(easingFunctions.easeOut).toEqual([0, 0, 0.58, 1])
    expect(easingFunctions.easeInOut).toEqual([0.42, 0, 0.58, 1])
  })
})

describe('resolveEasing', () => {
  it('falls back to linear when undefined', () => {
    expect(resolveEasing(undefined)).toEqual([0, 0, 1, 1])
  })

  it('looks up presets by name', () => {
    expect(resolveEasing('easeOut')).toEqual([0, 0, 0.58, 1])
  })

  it('passes explicit tuples through unchanged', () => {
    const tuple: [number, number, number, number] = [0.1, 0.2, 0.3, 0.9]
    expect(resolveEasing(tuple)).toEqual(tuple)
  })
})

describe('cubicBezier', () => {
  it('clamps endpoints', () => {
    expect(cubicBezier(0, 0.42, 0, 0.58, 1)).toBe(0)
    expect(cubicBezier(1, 0.42, 0, 0.58, 1)).toBe(1)
    expect(cubicBezier(-0.5, 0.42, 0, 0.58, 1)).toBe(0)
    expect(cubicBezier(2, 0.42, 0, 0.58, 1)).toBe(1)
  })

  it('returns t for the linear curve', () => {
    for (const t of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      const v = cubicBezier(t, 0, 0, 1, 1)
      expect(v).toBeCloseTo(t, 6)
    }
  })

  it('easeIn lags below linear in the first half', () => {
    // easeIn = [0.42, 0, 1, 1]: starts slow, accelerates.
    const v = cubicBezier(0.25, 0.42, 0, 1, 1)
    expect(v).toBeLessThan(0.25)
    expect(v).toBeGreaterThan(0)
  })

  it('easeOut leads above linear in the first half', () => {
    // easeOut = [0, 0, 0.58, 1]: starts fast, decelerates.
    const v = cubicBezier(0.25, 0, 0, 0.58, 1)
    expect(v).toBeGreaterThan(0.25)
    expect(v).toBeLessThan(1)
  })

  it('easeInOut crosses 0.5 at t=0.5 by symmetry', () => {
    // easeInOut control points are symmetric about (0.5, 0.5).
    const v = cubicBezier(0.5, 0.42, 0, 0.58, 1)
    expect(v).toBeCloseTo(0.5, 5)
  })

  it('matches a known CSS reference value', () => {
    // Reference value from Chrome DevTools timing-function evaluator.
    // ease-in [0.42, 0, 1, 1] at t=0.5 ≈ 0.3153.
    const v = cubicBezier(0.5, 0.42, 0, 1, 1)
    expect(v).toBeGreaterThan(0.3)
    expect(v).toBeLessThan(0.33)
  })
})

describe('sampleEasing', () => {
  it('routes preset names through the lookup table', () => {
    expect(sampleEasing('linear', 0.4)).toBeCloseTo(0.4, 6)
  })

  it('routes explicit tuples through cubicBezier', () => {
    expect(sampleEasing([0, 0, 1, 1], 0.3)).toBeCloseTo(0.3, 6)
  })

  it('treats undefined as linear', () => {
    expect(sampleEasing(undefined, 0.7)).toBeCloseTo(0.7, 6)
  })
})
