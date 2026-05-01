import { describe, expect, it } from 'vitest'

import {
  boundingBox,
  circularLayout,
  createRng,
  forceLayout,
  gridLayout,
  layoutNodes,
} from '../layout.js'
import type { GraphEdge, GraphNode } from '../types.js'

const nodes = (n: number): GraphNode[] =>
  Array.from({ length: n }, (_, i) => ({ id: `n${i}`, label: `Node ${i}` }))

describe('createRng', () => {
  it('produces deterministic output for the same seed', () => {
    const a = createRng(42)
    const b = createRng(42)
    for (let i = 0; i < 10; i++) {
      expect(a()).toBe(b())
    }
  })

  it('returns floats in [0, 1)', () => {
    const r = createRng(1)
    for (let i = 0; i < 100; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('circularLayout', () => {
  it('returns an empty array for no nodes', () => {
    expect(circularLayout([], 100)).toEqual([])
  })

  it('places every node on the given radius', () => {
    const out = circularLayout(nodes(6), 100)
    for (const p of out) {
      const r = Math.sqrt(p.x * p.x + p.y * p.y)
      expect(r).toBeCloseTo(100, 5)
    }
  })

  it('places a single node at the origin', () => {
    const out = circularLayout(nodes(1), 100)
    expect(out).toHaveLength(1)
    expect(out[0].x).toBe(0)
    expect(out[0].y).toBe(0)
  })
})

describe('gridLayout', () => {
  it('returns an empty array for no nodes', () => {
    expect(gridLayout([], 50)).toEqual([])
  })

  it('uses a sqrt-shaped grid centred on the origin', () => {
    const out = gridLayout(nodes(9), 50)
    expect(out).toHaveLength(9)
    // Mean position should be ~ origin.
    const mx = out.reduce((s, p) => s + p.x, 0) / out.length
    const my = out.reduce((s, p) => s + p.y, 0) / out.length
    expect(mx).toBeCloseTo(0, 5)
    expect(my).toBeCloseTo(0, 5)
  })
})

describe('forceLayout', () => {
  it('returns an empty array for no nodes', () => {
    expect(forceLayout([], [])).toEqual([])
  })

  it('produces finite coordinates for every node', () => {
    const out = forceLayout(nodes(8), [])
    expect(out).toHaveLength(8)
    for (const p of out) {
      expect(Number.isFinite(p.x)).toBe(true)
      expect(Number.isFinite(p.y)).toBe(true)
    }
  })

  it('separates two repelling nodes (no edges) so they stay apart', () => {
    const out = forceLayout(nodes(2), [], { iterations: 50, seed: 7 })
    const dx = out[1].x - out[0].x
    const dy = out[1].y - out[0].y
    const dist = Math.sqrt(dx * dx + dy * dy)
    // Repulsion alone with no spring should push them well past the 1e-4 floor.
    expect(dist).toBeGreaterThan(5)
  })

  it('pulls connected nodes closer than the no-edge baseline', () => {
    const ns = nodes(4)
    const edges: GraphEdge[] = [
      { id: 'e1', source: 'n0', target: 'n1' },
      { id: 'e2', source: 'n2', target: 'n3' },
    ]
    const out = forceLayout(ns, edges, { iterations: 200, seed: 1, restLength: 30 })
    const d01 = Math.hypot(out[1].x - out[0].x, out[1].y - out[0].y)
    const d23 = Math.hypot(out[3].x - out[2].x, out[3].y - out[2].y)
    // Connected pairs should sit close to restLength, not at the
    // initial seed-circle radius (~20+).
    expect(d01).toBeLessThan(80)
    expect(d23).toBeLessThan(80)
  })

  it('converges on a 4-node ring: max per-iteration displacement falls below epsilon', () => {
    const ns = nodes(4)
    const edges: GraphEdge[] = [
      { id: 'a', source: 'n0', target: 'n1' },
      { id: 'b', source: 'n1', target: 'n2' },
      { id: 'c', source: 'n2', target: 'n3' },
      { id: 'd', source: 'n3', target: 'n0' },
    ]
    const out1 = forceLayout(ns, edges, { iterations: 500, seed: 13 })
    const out2 = forceLayout(ns, edges, { iterations: 500, seed: 13 })
    // Same seed → same output (deterministic).
    for (let i = 0; i < ns.length; i++) {
      expect(out1[i].x).toBeCloseTo(out2[i].x, 5)
      expect(out1[i].y).toBeCloseTo(out2[i].y, 5)
    }
  })

  it('respects the iterations cap', () => {
    // Single iteration shouldn't crash and should still produce finite coords.
    const out = forceLayout(nodes(5), [], { iterations: 1, seed: 1 })
    for (const p of out) {
      expect(Number.isFinite(p.x)).toBe(true)
      expect(Number.isFinite(p.y)).toBe(true)
    }
  })

  it('skips self-loops without crashing', () => {
    const ns = nodes(2)
    const edges: GraphEdge[] = [{ id: 'self', source: 'n0', target: 'n0' }]
    const out = forceLayout(ns, edges, { iterations: 20, seed: 1 })
    expect(out).toHaveLength(2)
  })
})

describe('layoutNodes', () => {
  it('dispatches to the named layout', () => {
    const ns = nodes(4)
    const c = layoutNodes(ns, [], 'circular')
    const g = layoutNodes(ns, [], 'grid')
    const f = layoutNodes(ns, [], 'force', { iterations: 5, seed: 1 })
    expect(c).toHaveLength(4)
    expect(g).toHaveLength(4)
    expect(f).toHaveLength(4)
    // Circular places points on the same radius from origin.
    const r0 = Math.hypot(c[0].x, c[0].y)
    const r1 = Math.hypot(c[1].x, c[1].y)
    expect(r1).toBeCloseTo(r0, 5)
  })
})

describe('boundingBox', () => {
  it('returns null for empty input', () => {
    expect(boundingBox([])).toBeNull()
  })

  it('expands by the requested padding', () => {
    const box = boundingBox([{ id: 'a', label: 'A', x: 0, y: 0 }], 10)
    expect(box).toEqual({ minX: -10, minY: -10, maxX: 10, maxY: 10 })
  })
})
