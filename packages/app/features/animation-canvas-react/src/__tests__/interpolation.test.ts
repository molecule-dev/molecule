import { describe, expect, it } from 'vitest'

import { bracketKeyframes, interpolateState, lerp, pickEasing } from '../interpolation.js'
import type { AnimationKeyframe, ShapeState } from '../types.js'

const shape = (overrides: Partial<ShapeState> & { id: string }): ShapeState => ({
  id: overrides.id,
  x: overrides.x ?? 0,
  y: overrides.y ?? 0,
  rotation: overrides.rotation ?? 0,
  scale: overrides.scale ?? 1,
  opacity: overrides.opacity ?? 1,
  easing: overrides.easing,
  easings: overrides.easings,
})

describe('lerp', () => {
  it('returns a at t=0 and b at t=1', () => {
    expect(lerp(10, 20, 0)).toBe(10)
    expect(lerp(10, 20, 1)).toBe(20)
  })

  it('returns midpoint at t=0.5', () => {
    expect(lerp(10, 20, 0.5)).toBe(15)
  })

  it('extrapolates outside [0, 1]', () => {
    expect(lerp(10, 20, 1.5)).toBe(25)
    expect(lerp(10, 20, -0.5)).toBe(5)
  })
})

describe('bracketKeyframes', () => {
  const keyframes: AnimationKeyframe[] = [
    { time: 0, state: [shape({ id: 'a' })] },
    { time: 1, state: [shape({ id: 'a', x: 10 })] },
    { time: 2, state: [shape({ id: 'a', x: 20 })] },
  ]

  it('clamps to the first keyframe for early times', () => {
    const r = bracketKeyframes(keyframes, -1)
    expect(r.a).toBe(keyframes[0])
    expect(r.b).toBe(keyframes[0])
    expect(r.alpha).toBe(0)
  })

  it('clamps to the last keyframe for late times', () => {
    const r = bracketKeyframes(keyframes, 5)
    expect(r.a).toBe(keyframes[2])
    expect(r.b).toBe(keyframes[2])
    expect(r.alpha).toBe(1)
  })

  it('finds the correct bracketing pair', () => {
    const r = bracketKeyframes(keyframes, 0.5)
    expect(r.a).toBe(keyframes[0])
    expect(r.b).toBe(keyframes[1])
    expect(r.alpha).toBeCloseTo(0.5, 6)
  })

  it('handles exact keyframe boundaries (lands on left frame)', () => {
    const r = bracketKeyframes(keyframes, 1)
    // Either [k0,k1,1] or [k1,k2,0] is valid — both yield the same state.
    expect(r.alpha === 1 || r.alpha === 0).toBe(true)
  })

  it('throws on empty keyframes', () => {
    expect(() => bracketKeyframes([], 0)).toThrow()
  })
})

describe('pickEasing', () => {
  it('prefers per-property easing over whole-shape easing', () => {
    const s = shape({ id: 'a', easing: 'easeIn', easings: { x: 'easeOut' } })
    expect(pickEasing(s, 'x')).toBe('easeOut')
    expect(pickEasing(s, 'y')).toBe('easeIn')
  })

  it('falls back to whole-shape easing when per-prop is unset', () => {
    const s = shape({ id: 'a', easing: 'easeIn' })
    expect(pickEasing(s, 'rotation')).toBe('easeIn')
  })

  it('returns undefined (linear) when nothing is set', () => {
    const s = shape({ id: 'a' })
    expect(pickEasing(s, 'opacity')).toBeUndefined()
  })
})

describe('interpolateState — basic linear case', () => {
  const keyframes: AnimationKeyframe[] = [
    {
      time: 0,
      state: [shape({ id: 'a', x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 })],
    },
    {
      time: 1,
      state: [shape({ id: 'a', x: 100, y: 50, rotation: 180, scale: 2, opacity: 0.5 })],
    },
  ]

  it('returns first keyframe state at t=0', () => {
    const r = interpolateState(keyframes, 0)
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ id: 'a', x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 })
  })

  it('returns last keyframe state at t=lastTime', () => {
    const r = interpolateState(keyframes, 1)
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ id: 'a', x: 100, y: 50, rotation: 180, scale: 2, opacity: 0.5 })
  })

  it('returns the midpoint at t=0.5 (linear default)', () => {
    const r = interpolateState(keyframes, 0.5)
    expect(r[0].x).toBeCloseTo(50, 6)
    expect(r[0].y).toBeCloseTo(25, 6)
    expect(r[0].rotation).toBeCloseTo(90, 6)
    expect(r[0].scale).toBeCloseTo(1.5, 6)
    expect(r[0].opacity).toBeCloseTo(0.75, 6)
  })

  it('clamps times outside the range', () => {
    const before = interpolateState(keyframes, -1)
    const after = interpolateState(keyframes, 2)
    expect(before[0].x).toBe(0)
    expect(after[0].x).toBe(100)
  })

  it('returns empty array for empty keyframes', () => {
    expect(interpolateState([], 0)).toEqual([])
  })
})

describe('interpolateState — easing curves', () => {
  it('easeIn yields x < linear midpoint at t=0.25', () => {
    const keyframes: AnimationKeyframe[] = [
      { time: 0, state: [shape({ id: 'a', x: 0 })] },
      { time: 1, state: [shape({ id: 'a', x: 100, easing: 'easeIn' })] },
    ]
    const r = interpolateState(keyframes, 0.25)
    expect(r[0].x).toBeLessThan(25) // Linear would be 25.
    expect(r[0].x).toBeGreaterThan(0)
  })

  it('easeOut yields x > linear midpoint at t=0.25', () => {
    const keyframes: AnimationKeyframe[] = [
      { time: 0, state: [shape({ id: 'a', x: 0 })] },
      { time: 1, state: [shape({ id: 'a', x: 100, easing: 'easeOut' })] },
    ]
    const r = interpolateState(keyframes, 0.25)
    expect(r[0].x).toBeGreaterThan(25)
    expect(r[0].x).toBeLessThan(100)
  })

  it('per-property easing applies only to that property', () => {
    const keyframes: AnimationKeyframe[] = [
      { time: 0, state: [shape({ id: 'a', x: 0, y: 0 })] },
      {
        time: 1,
        state: [
          shape({
            id: 'a',
            x: 100,
            y: 100,
            easings: { x: 'easeIn' },
          }),
        ],
      },
    ]
    const r = interpolateState(keyframes, 0.25)
    expect(r[0].x).toBeLessThan(25) // eased
    expect(r[0].y).toBeCloseTo(25, 6) // linear
  })

  it('explicit bezier tuple is honoured', () => {
    const keyframes: AnimationKeyframe[] = [
      { time: 0, state: [shape({ id: 'a', x: 0 })] },
      {
        time: 1,
        state: [
          shape({
            id: 'a',
            x: 100,
            easings: { x: [0, 0, 1, 1] }, // linear via explicit tuple
          }),
        ],
      },
    ]
    const r = interpolateState(keyframes, 0.5)
    expect(r[0].x).toBeCloseTo(50, 6)
  })
})

describe('interpolateState — keyframe boundaries', () => {
  it('lands exactly on each keyframe at its time', () => {
    const keyframes: AnimationKeyframe[] = [
      { time: 0, state: [shape({ id: 'a', x: 0 })] },
      { time: 1, state: [shape({ id: 'a', x: 50 })] },
      { time: 2, state: [shape({ id: 'a', x: 200 })] },
    ]
    expect(interpolateState(keyframes, 0)[0].x).toBe(0)
    expect(interpolateState(keyframes, 1)[0].x).toBe(50)
    expect(interpolateState(keyframes, 2)[0].x).toBe(200)
  })

  it('handles three keyframes by selecting the right segment', () => {
    const keyframes: AnimationKeyframe[] = [
      { time: 0, state: [shape({ id: 'a', x: 0 })] },
      { time: 1, state: [shape({ id: 'a', x: 100 })] },
      { time: 2, state: [shape({ id: 'a', x: 0 })] },
    ]
    // Halfway through second segment → x = 50.
    const r = interpolateState(keyframes, 1.5)
    expect(r[0].x).toBeCloseTo(50, 6)
  })

  it('zero-span segment does not divide by zero', () => {
    const keyframes: AnimationKeyframe[] = [
      { time: 0, state: [shape({ id: 'a', x: 0 })] },
      { time: 0, state: [shape({ id: 'a', x: 100 })] },
    ]
    const r = interpolateState(keyframes, 0)
    expect(Number.isFinite(r[0].x)).toBe(true)
  })
})

describe('interpolateState — shapes appearing/vanishing', () => {
  it('fades a vanishing shape toward 0 opacity', () => {
    const keyframes: AnimationKeyframe[] = [
      { time: 0, state: [shape({ id: 'a', opacity: 1 }), shape({ id: 'b', opacity: 1 })] },
      { time: 1, state: [shape({ id: 'a', opacity: 1 })] },
    ]
    const r = interpolateState(keyframes, 0.5)
    const b = r.find((s) => s.id === 'b')!
    expect(b.opacity).toBeCloseTo(0.5, 6)
  })

  it('fades a newly-appearing shape in from 0 opacity', () => {
    const keyframes: AnimationKeyframe[] = [
      { time: 0, state: [shape({ id: 'a', opacity: 1 })] },
      { time: 1, state: [shape({ id: 'a', opacity: 1 }), shape({ id: 'b', opacity: 1 })] },
    ]
    const r = interpolateState(keyframes, 0.5)
    const b = r.find((s) => s.id === 'b')!
    expect(b.opacity).toBeCloseTo(0.5, 6)
  })
})
