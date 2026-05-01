/**
 * Unit tests for the Lottie 5.x serializer. Verifies the schema fields a
 * Lottie player needs to play the animation are present and consistent
 * with the source {@link AnimationDocument}.
 */

import { describe, expect, it } from 'vitest'

import { toLottie } from '../lottie.js'
import type { AnimationDocument } from '../types.js'

const docFixture = (overrides: Partial<AnimationDocument> = {}): AnimationDocument => ({
  width: 800,
  height: 600,
  fps: 30,
  duration: 2,
  background: '#ffffff',
  layers: [
    {
      id: 'square',
      kind: 'rect',
      shape: { x: 0, y: 0, width: 100, height: 100, fill: '#3b82f6' },
      transform: { x: 50, y: 50, opacity: 1 },
      tracks: {
        'transform.x': [
          { time: 0, value: 50, easing: 'ease-in-out' },
          { time: 1, value: 700 },
        ],
      },
    },
  ],
  ...overrides,
})

describe('toLottie', () => {
  it('emits the expected top-level Lottie 5.x fields', () => {
    const out = toLottie(docFixture(), { fps: 30, width: 800, height: 600 })
    expect(out.v).toMatch(/^5\./)
    expect(out.fr).toBe(30)
    expect(out.ip).toBe(0)
    expect(out.op).toBe(60) // 2s * 30fps
    expect(out.w).toBe(800)
    expect(out.h).toBe(600)
    expect(out.ddd).toBe(0)
    expect(Array.isArray(out.assets)).toBe(true)
    expect(Array.isArray(out.layers)).toBe(true)
  })

  it('emits one Lottie layer per AnimationLayer with stable z-order', () => {
    const out = toLottie(
      docFixture({
        layers: [
          { id: 'a', kind: 'rect', shape: {} },
          { id: 'b', kind: 'rect', shape: {} },
        ],
      }),
      { fps: 30, width: 800, height: 600 },
    )
    expect(out.layers).toHaveLength(2)
    expect(out.layers[0]!.nm).toBe('a')
    expect(out.layers[0]!.ind).toBe(0)
    expect(out.layers[1]!.nm).toBe('b')
    expect(out.layers[1]!.ind).toBe(1)
  })

  it('emits a static position when no transform tracks are set', () => {
    const out = toLottie(
      docFixture({
        layers: [
          {
            id: 'static',
            kind: 'rect',
            shape: {},
            transform: { x: 10, y: 20 },
          },
        ],
      }),
      { fps: 30, width: 800, height: 600 },
    )
    expect(out.layers[0]!.ks.p.a).toBe(0)
    expect(out.layers[0]!.ks.p.k).toEqual([10, 20, 0])
  })

  it('emits an animated position when an x track exists', () => {
    const out = toLottie(docFixture(), { fps: 30, width: 800, height: 600 })
    const position = out.layers[0]!.ks.p
    expect(position.a).toBe(1)
    const keyframes = position.k as unknown as Array<{ t: number; s: number[] }>
    expect(keyframes).toHaveLength(2)
    expect(keyframes[0]!.t).toBe(0)
    expect(keyframes[1]!.t).toBe(30) // 1s * 30fps
    expect(keyframes[0]!.s[0]).toBe(50)
    expect(keyframes[1]!.s[0]).toBe(700)
  })

  it('serializes losslessly to JSON', () => {
    const out = toLottie(docFixture(), { fps: 30, width: 800, height: 600 })
    const round = JSON.parse(JSON.stringify(out))
    expect(round.v).toBe(out.v)
    expect(round.layers).toHaveLength(out.layers.length)
  })

  it('rounds duration*fps down to whole frames', () => {
    const out = toLottie(docFixture({ duration: 1.5 }), { fps: 30, width: 800, height: 600 })
    expect(out.op).toBe(45)
  })
})
