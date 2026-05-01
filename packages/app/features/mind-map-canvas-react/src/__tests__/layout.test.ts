import { describe, expect, it } from 'vitest'

import {
  computeHorizontalTreePositions,
  computeRadialPositions,
  DEFAULT_NODE_HEIGHT,
  DEFAULT_NODE_WIDTH,
} from '../layout.js'
import type { MindMapNode } from '../types.js'

const tree = (id: string, text: string, children: MindMapNode[] = []): MindMapNode => ({
  id,
  text,
  children,
})

describe('computeRadialPositions', () => {
  it('places only the root when the tree is a single node', () => {
    const root = tree('r', 'root')
    const out = computeRadialPositions(root, { origin: { x: 100, y: 100 } })
    expect(out.visibleNodes).toHaveLength(1)
    expect(out.edges).toHaveLength(0)
    // Root is centered on origin (top-left = origin - half-size).
    expect(out.positions.get('r')).toEqual({
      x: 100 - DEFAULT_NODE_WIDTH / 2,
      y: 100 - DEFAULT_NODE_HEIGHT / 2,
    })
  })

  it('fans children out at uniform angles on the first ring', () => {
    const root = tree('r', 'root', [tree('a', 'A'), tree('b', 'B'), tree('c', 'C'), tree('d', 'D')])
    const out = computeRadialPositions(root, {
      origin: { x: 0, y: 0 },
      ringSpacing: 100,
    })
    expect(out.visibleNodes.map((n) => n.id)).toEqual(['r', 'a', 'b', 'c', 'd'])
    expect(out.edges).toEqual([
      { parentId: 'r', childId: 'a' },
      { parentId: 'r', childId: 'b' },
      { parentId: 'r', childId: 'c' },
      { parentId: 'r', childId: 'd' },
    ])
    // Each child sits at radius=100 from origin (account for top-left vs center).
    for (const id of ['a', 'b', 'c', 'd']) {
      const p = out.positions.get(id)!
      const cx = p.x + DEFAULT_NODE_WIDTH / 2
      const cy = p.y + DEFAULT_NODE_HEIGHT / 2
      const r = Math.sqrt(cx * cx + cy * cy)
      expect(r).toBeCloseTo(100, 5)
    }
  })

  it('hides descendants of a collapsed subtree', () => {
    const root = tree('r', 'root', [
      { id: 'a', text: 'A', collapsed: true, children: [tree('a1', 'A1'), tree('a2', 'A2')] },
      tree('b', 'B'),
    ])
    const out = computeRadialPositions(root)
    expect(out.visibleNodes.map((n) => n.id)).toEqual(['r', 'a', 'b'])
    expect(out.positions.has('a1')).toBe(false)
    expect(out.positions.has('a2')).toBe(false)
    // Edges only between visible parent/child pairs.
    expect(out.edges.map((e) => `${e.parentId}->${e.childId}`)).toEqual(['r->a', 'r->b'])
  })
})

describe('computeHorizontalTreePositions', () => {
  it('places generations along +X by default', () => {
    const root = tree('r', 'root', [tree('a', 'A'), tree('b', 'B')])
    const out = computeHorizontalTreePositions(root, {
      origin: { x: 0, y: 0 },
      stepX: 200,
      stepY: 50,
    })
    const r = out.positions.get('r')!
    const a = out.positions.get('a')!
    const b = out.positions.get('b')!
    // Root sits at depth 0, children at depth 1 -> a.x = b.x.
    expect(a.x - r.x).toBeCloseTo(200, 5)
    expect(b.x - r.x).toBeCloseTo(200, 5)
    // Siblings stack vertically by stepY.
    expect(b.y - a.y).toBeCloseTo(50, 5)
  })

  it('vertical axis swaps the role of x and y', () => {
    const root = tree('r', 'root', [tree('a', 'A'), tree('b', 'B')])
    const out = computeHorizontalTreePositions(
      root,
      { origin: { x: 0, y: 0 }, stepX: 200, stepY: 50 },
      'vertical',
    )
    const r = out.positions.get('r')!
    const a = out.positions.get('a')!
    const b = out.positions.get('b')!
    // Generations now go along +Y.
    expect(a.y - r.y).toBeCloseTo(200, 5)
    expect(b.y - r.y).toBeCloseTo(200, 5)
    // Siblings stack horizontally.
    expect(b.x - a.x).toBeCloseTo(50, 5)
  })

  it('centers the parent between its first and last leaves', () => {
    const root = tree('r', 'root', [
      tree('a', 'A', [tree('a1', 'A1'), tree('a2', 'A2'), tree('a3', 'A3')]),
    ])
    const out = computeHorizontalTreePositions(root, {
      origin: { x: 0, y: 0 },
      stepX: 200,
      stepY: 50,
    })
    const a = out.positions.get('a')!
    const a1 = out.positions.get('a1')!
    const a3 = out.positions.get('a3')!
    expect(a.y).toBeCloseTo((a1.y + a3.y) / 2, 5)
  })

  it('still emits an edge per visible parent/child link', () => {
    const root = tree('r', 'root', [tree('a', 'A', [tree('a1', 'A1')]), tree('b', 'B')])
    const out = computeHorizontalTreePositions(root)
    expect(out.edges).toEqual([
      { parentId: 'a', childId: 'a1' },
      { parentId: 'r', childId: 'a' },
      { parentId: 'r', childId: 'b' },
    ])
  })
})
