/**
 * Unit tests for the per-frame snapshot builder. The output is a
 * canvas-render-shaped document; we assert each layer is composed of
 * the static `shape` plus interpolated track values.
 */

import { describe, expect, it } from 'vitest'

import { snapshotAtTime } from '../snapshot.js'
import type { AnimationDocument } from '../types.js'

describe('snapshotAtTime', () => {
  const doc: AnimationDocument = {
    width: 400,
    height: 300,
    duration: 1,
    background: '#000000',
    layers: [
      {
        id: 'rect',
        kind: 'rect',
        shape: { x: 0, y: 0, width: 100, height: 100, fill: '#ff0000' },
        tracks: {
          'transform.x': [
            { time: 0, value: 0 },
            { time: 1, value: 200 },
          ],
          fill: [
            { time: 0, value: '#ff0000' },
            { time: 1, value: '#0000ff' },
          ],
        },
      },
    ],
  }

  it('preserves canvas-render document fields', () => {
    const snap = snapshotAtTime(doc, 0)
    expect(snap.width).toBe(400)
    expect(snap.height).toBe(300)
    expect(snap.background).toBe('#000000')
  })

  it('writes transform.x track values to the layer top-level x', () => {
    const start = snapshotAtTime(doc, 0)
    const half = snapshotAtTime(doc, 0.5)
    const end = snapshotAtTime(doc, 1)
    expect(start.layers[0]!['x']).toBe(0)
    expect(half.layers[0]!['x']).toBe(100)
    expect(end.layers[0]!['x']).toBe(200)
  })

  it('writes shape-level tracks (fill) to the layer top-level field', () => {
    const half = snapshotAtTime(doc, 0.5)
    expect(half.layers[0]!['fill']).toBe('#800080')
  })

  it('preserves untouched static shape fields', () => {
    const half = snapshotAtTime(doc, 0.5)
    expect(half.layers[0]!['width']).toBe(100)
    expect(half.layers[0]!['height']).toBe(100)
  })

  it('recurses into group children', () => {
    const grouped: AnimationDocument = {
      width: 100,
      height: 100,
      duration: 1,
      layers: [
        {
          id: 'g',
          kind: 'group',
          shape: {},
          children: [
            {
              id: 'inner',
              kind: 'rect',
              shape: { width: 10, height: 10 },
              tracks: { 'transform.x': [{ time: 0, value: 5 }] },
            },
          ],
        },
      ],
    }
    const snap = snapshotAtTime(grouped, 0)
    const group = snap.layers[0] as Record<string, unknown> & {
      children: Array<Record<string, unknown>>
    }
    expect(group.children).toHaveLength(1)
    expect(group.children[0]!['x']).toBe(5)
    expect(group.children[0]!['width']).toBe(10)
  })
})
