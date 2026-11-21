import { describe, expect, it } from 'vitest'

import { alignLayers, distributeLayers } from '../alignment.js'
import type { VectorElement } from '../types.js'

const rect = (id: string, x: number, y: number, w = 10, h = 10): VectorElement => ({
  id,
  kind: 'rect',
  x,
  y,
  width: w,
  height: h,
})

describe('alignLayers', () => {
  it('aligns selected layers to the left of their envelope', () => {
    const layers = [rect('a', 0, 0), rect('b', 20, 30), rect('c', 100, 200)]
    const out = alignLayers(layers, ['a', 'b', 'c'], 'left')
    expect(out.map((l) => (l as Extract<VectorElement, { kind: 'rect' }>).x)).toEqual([0, 0, 0])
  })

  it('aligns to the right edge of the envelope', () => {
    const layers = [rect('a', 0, 0, 10), rect('b', 20, 0, 30)]
    const out = alignLayers(layers, ['a', 'b'], 'right')
    const xs = out.map((l) => (l as Extract<VectorElement, { kind: 'rect' }>).x)
    // envelope right is 50; rect 'a' (w=10) → x=40; rect 'b' (w=30) → x=20
    expect(xs).toEqual([40, 20])
  })

  it('centers horizontally on the envelope center', () => {
    const layers = [rect('a', 0, 0, 10), rect('b', 100, 0, 10)]
    const out = alignLayers(layers, ['a', 'b'], 'center')
    const xs = out.map((l) => (l as Extract<VectorElement, { kind: 'rect' }>).x)
    // envelope center = 55, half-width = 5, so each rect → x=50
    expect(xs).toEqual([50, 50])
  })

  it('returns the input slice when only one layer is selected', () => {
    const layers = [rect('a', 0, 0), rect('b', 20, 30)]
    const out = alignLayers(layers, ['a'], 'left')
    expect(out).toEqual(layers)
  })

  it('passes through layers that are not selected', () => {
    const layers = [rect('a', 0, 0), rect('b', 50, 0), rect('c', 1000, 0)]
    const out = alignLayers(layers, ['a', 'b'], 'left')
    expect((out[2] as Extract<VectorElement, { kind: 'rect' }>).x).toBe(1000)
  })
})

describe('distributeLayers', () => {
  it('evenly spaces three layers along the horizontal axis', () => {
    // First and last fix the span; middle gets equal gap on both sides.
    const layers = [rect('a', 0, 0, 10), rect('b', 30, 0, 10), rect('c', 100, 0, 10)]
    const out = distributeLayers(layers, ['a', 'b', 'c'], 'horizontal')
    const xs = out.map((l) => (l as Extract<VectorElement, { kind: 'rect' }>).x)
    // total span = 110 - 0 = 110; widths sum = 30; gap = (110 - 30) / 2 = 40
    // a stays at 0; b at 0+10+40 = 50; c at 50+10+40 = 100
    expect(xs).toEqual([0, 50, 100])
  })

  it('returns the slice when fewer than three are selected', () => {
    const layers = [rect('a', 0, 0), rect('b', 50, 0)]
    const out = distributeLayers(layers, ['a', 'b'], 'horizontal')
    expect(out).toEqual(layers)
  })
})
