import { describe, expect, it } from 'vitest'

import { collectReferences, coordKey, topologicalSort } from '../dependencies.js'
import type { AstNode, CellCoord } from '../types.js'

function ref(col: number, row: number): AstNode {
  return { kind: 'reference', coord: { col, row }, text: '' }
}

function range(c1: number, r1: number, c2: number, r2: number): AstNode {
  return {
    kind: 'range',
    range: { start: { col: c1, row: r1 }, end: { col: c2, row: r2 } },
    text: '',
  }
}

function num(value: number): AstNode {
  return { kind: 'number', value }
}

describe('collectReferences', () => {
  it('returns [] for a literal-only AST', () => {
    expect(collectReferences(num(42))).toEqual([])
  })

  it('returns the single coord for a reference node', () => {
    const out = collectReferences(ref(2, 5))
    expect(out).toEqual([{ col: 2, row: 5 }])
  })

  it('expands a range into every cell coord (inclusive)', () => {
    // 2x2 range A1:B2 → 4 cells
    const out = collectReferences(range(0, 0, 1, 1))
    expect(out).toHaveLength(4)
    expect(out).toContainEqual({ col: 0, row: 0 })
    expect(out).toContainEqual({ col: 1, row: 1 })
  })

  it('walks both operands of binary nodes', () => {
    const node: AstNode = {
      kind: 'binary',
      op: '+',
      left: ref(0, 0),
      right: ref(1, 1),
    }
    expect(collectReferences(node)).toHaveLength(2)
  })

  it('walks the operand of unary nodes', () => {
    const node: AstNode = { kind: 'unary', op: '-', operand: ref(5, 3) }
    expect(collectReferences(node)).toEqual([{ col: 5, row: 3 }])
  })

  it('walks every arg of function-call nodes', () => {
    const node: AstNode = {
      kind: 'call',
      name: 'SUM',
      args: [ref(0, 0), ref(1, 0), ref(2, 0)],
    }
    expect(collectReferences(node)).toHaveLength(3)
  })

  it('allows duplicate coords from overlapping branches', () => {
    const node: AstNode = {
      kind: 'binary',
      op: '+',
      left: ref(0, 0),
      right: ref(0, 0), // same coord
    }
    const refs = collectReferences(node)
    expect(refs).toHaveLength(2) // not de-duped
  })

  it('handles deeply-nested mixed nodes', () => {
    // SUM(A1, B1:C2) + -D5
    const node: AstNode = {
      kind: 'binary',
      op: '+',
      left: {
        kind: 'call',
        name: 'SUM',
        args: [ref(0, 0), range(1, 0, 2, 1)],
      },
      right: { kind: 'unary', op: '-', operand: ref(3, 4) },
    }
    const refs = collectReferences(node)
    // 1 single ref + 4 range cells + 1 unary ref = 6 total
    expect(refs).toHaveLength(6)
    expect(refs).toContainEqual({ col: 3, row: 4 })
  })
})

describe('topologicalSort', () => {
  function asMap(edges: Record<string, string[]>): Map<string, Set<string>> {
    const m = new Map<string, Set<string>>()
    for (const [k, v] of Object.entries(edges)) m.set(k, new Set(v))
    return m
  }

  it('orders a simple chain a → b → c', () => {
    const { order, cycle } = topologicalSort(asMap({ a: ['b'], b: ['c'], c: [] }), ['a', 'b', 'c'])
    expect(order).toEqual(['a', 'b', 'c'])
    expect(cycle.size).toBe(0)
  })

  it('orders a diamond a → b, a → c, b → d, c → d', () => {
    const { order, cycle } = topologicalSort(asMap({ a: ['b', 'c'], b: ['d'], c: ['d'], d: [] }), [
      'a',
      'b',
      'c',
      'd',
    ])
    expect(order[0]).toBe('a')
    expect(order[order.length - 1]).toBe('d')
    expect(cycle.size).toBe(0)
  })

  it('detects a simple 2-cycle and excludes members from order', () => {
    const { order, cycle } = topologicalSort(asMap({ a: ['b'], b: ['a'] }), ['a', 'b'])
    expect(order).toEqual([])
    expect(cycle.has('a')).toBe(true)
    expect(cycle.has('b')).toBe(true)
  })

  it('detects a 3-cycle', () => {
    const { order, cycle } = topologicalSort(asMap({ a: ['b'], b: ['c'], c: ['a'] }), [
      'a',
      'b',
      'c',
    ])
    expect(order).toEqual([])
    expect(cycle.size).toBe(3)
  })

  it('sorts the non-cyclic prefix; cycle members go in `cycle`', () => {
    // a → b → c → b (b ↔ c cycle); x is independent and should still order.
    const { order, cycle } = topologicalSort(asMap({ a: ['b'], b: ['c'], c: ['b'], x: [] }), [
      'a',
      'b',
      'c',
      'x',
    ])
    expect(order).toContain('a')
    expect(order).toContain('x')
    expect(cycle.has('b')).toBe(true)
    expect(cycle.has('c')).toBe(true)
  })

  it('ignores edges that point outside the supplied keys set', () => {
    // External edge to 'z' should be ignored; a → b should still order.
    const { order, cycle } = topologicalSort(
      asMap({ a: ['b', 'z'], b: [] }),
      ['a', 'b'], // 'z' not included
    )
    expect(order).toEqual(['a', 'b'])
    expect(cycle.size).toBe(0)
  })

  it('handles a key with no edges (isolated node)', () => {
    const { order, cycle } = topologicalSort(asMap({ a: [] }), ['a'])
    expect(order).toEqual(['a'])
    expect(cycle.size).toBe(0)
  })

  it('handles missing edge entries (key not in dependents map)', () => {
    const { order, cycle } = topologicalSort(asMap({}), ['a', 'b'])
    expect(order.sort()).toEqual(['a', 'b'])
    expect(cycle.size).toBe(0)
  })

  it('returns empty order + empty cycle for empty input', () => {
    const { order, cycle } = topologicalSort(asMap({}), [])
    expect(order).toEqual([])
    expect(cycle.size).toBe(0)
  })
})

describe('coordKey (re-exported)', () => {
  it('is callable and returns a string', () => {
    const c: CellCoord = { col: 1, row: 2 }
    const key = coordKey(c)
    expect(typeof key).toBe('string')
    expect(key.length).toBeGreaterThan(0)
  })

  it('is deterministic for the same coord', () => {
    expect(coordKey({ col: 5, row: 7 })).toBe(coordKey({ col: 5, row: 7 }))
  })

  it('differs for different coords', () => {
    expect(coordKey({ col: 0, row: 0 })).not.toBe(coordKey({ col: 0, row: 1 }))
    expect(coordKey({ col: 0, row: 0 })).not.toBe(coordKey({ col: 1, row: 0 }))
  })
})
