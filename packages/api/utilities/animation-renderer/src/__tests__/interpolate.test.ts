/**
 * Unit tests for the interpolation primitives. The lottie path and the
 * frame-rasterization path both share this module, so its correctness
 * is load-bearing for every output format.
 */

import { describe, expect, it } from 'vitest'

import { applyEasing, lerp, lerpColor, valueAtTime } from '../interpolate.js'

describe('applyEasing', () => {
  it('clamps below 0 and above 1', () => {
    expect(applyEasing(-1, 'linear')).toBe(0)
    expect(applyEasing(2, 'linear')).toBe(1)
  })

  it('linear is the identity in (0,1)', () => {
    expect(applyEasing(0.5, 'linear')).toBe(0.5)
    expect(applyEasing(0.25, undefined)).toBe(0.25)
  })

  it('step holds at the start until the segment ends', () => {
    expect(applyEasing(0.5, 'step')).toBe(0)
    expect(applyEasing(0.999, 'step')).toBe(0)
  })

  it('ease-in is convex (slow start)', () => {
    const u = applyEasing(0.5, 'ease-in')
    expect(u).toBeLessThan(0.5)
  })

  it('ease-out is concave (fast start)', () => {
    const u = applyEasing(0.5, 'ease-out')
    expect(u).toBeGreaterThan(0.5)
  })

  it('ease-in-out crosses 0.5 at u=0.5', () => {
    expect(applyEasing(0.5, 'ease-in-out')).toBeCloseTo(0.5, 5)
  })
})

describe('lerp', () => {
  it('endpoints are exact', () => {
    expect(lerp(10, 20, 0)).toBe(10)
    expect(lerp(10, 20, 1)).toBe(20)
  })

  it('midpoint is the mean', () => {
    expect(lerp(10, 20, 0.5)).toBe(15)
  })
})

describe('lerpColor', () => {
  it('interpolates 6-digit hex channels', () => {
    expect(lerpColor('#000000', '#ffffff', 0.5)).toBe('#808080')
  })

  it('handles 3-digit hex shorthand', () => {
    expect(lerpColor('#000', '#fff', 1)).toBe('#ffffff')
  })

  it('preserves alpha when either input has it', () => {
    const out = lerpColor('#ff0000ff', '#0000ff00', 0.5)
    expect(out).toMatch(/^#[0-9a-f]{8}$/)
    expect(out.endsWith('80') || out.endsWith('7f')).toBe(true)
  })

  it('snaps on non-hex inputs', () => {
    expect(lerpColor('rgb(0,0,0)', 'red', 0.4)).toBe('rgb(0,0,0)')
    expect(lerpColor('rgb(0,0,0)', 'red', 0.6)).toBe('red')
  })
})

describe('valueAtTime', () => {
  it('returns undefined for an empty track', () => {
    expect(valueAtTime([], 0.5)).toBeUndefined()
  })

  it('returns the single value when there is exactly one keyframe', () => {
    expect(valueAtTime([{ time: 0, value: 42 }], 5)).toBe(42)
  })

  it('holds before the first keyframe', () => {
    expect(
      valueAtTime(
        [
          { time: 1, value: 10 },
          { time: 2, value: 20 },
        ],
        0,
      ),
    ).toBe(10)
  })

  it('holds after the last keyframe', () => {
    expect(
      valueAtTime(
        [
          { time: 0, value: 10 },
          { time: 1, value: 20 },
        ],
        2,
      ),
    ).toBe(20)
  })

  it('linearly interpolates between numeric keyframes', () => {
    const v = valueAtTime(
      [
        { time: 0, value: 0 },
        { time: 1, value: 100 },
      ],
      0.25,
    )
    expect(v).toBe(25)
  })

  it('eases the interval when a keyframe declares an easing', () => {
    const v = valueAtTime(
      [
        { time: 0, value: 0, easing: 'ease-in' },
        { time: 1, value: 100 },
      ],
      0.5,
    )
    expect(v).toBeLessThan(50)
  })

  it('interpolates colors when both endpoints are hex', () => {
    const v = valueAtTime(
      [
        { time: 0, value: '#000000' },
        { time: 1, value: '#ffffff' },
      ],
      0.5,
    )
    expect(v).toBe('#808080')
  })
})
