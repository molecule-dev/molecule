// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'

import {
  addEdge,
  bezierPath,
  clientToWorld,
  defaultSourcePort,
  defaultTargetPort,
  moveNode,
  removeEdge,
  removeNode,
  translateNode,
} from '../geometry.js'
import type { FlowEdge, FlowNode } from '../types.js'

const node = (id: string, x: number, y: number, w?: number, h?: number): FlowNode => ({
  id,
  type: 't',
  position: { x, y },
  width: w,
  height: h,
})

describe('defaultSourcePort / defaultTargetPort', () => {
  it('uses node width / height defaults', () => {
    const n = node('a', 10, 20)
    expect(defaultSourcePort(n)).toEqual({ x: 10 + 180, y: 20 + 80 / 2 })
    expect(defaultTargetPort(n)).toEqual({ x: 10, y: 20 + 80 / 2 })
  })

  it('respects explicit width / height', () => {
    const n = node('a', 0, 0, 100, 40)
    expect(defaultSourcePort(n)).toEqual({ x: 100, y: 20 })
    expect(defaultTargetPort(n)).toEqual({ x: 0, y: 20 })
  })
})

describe('bezierPath', () => {
  it('emits a cubic SVG path string', () => {
    const d = bezierPath({ x: 0, y: 0 }, { x: 100, y: 50 })
    expect(d.startsWith('M 0 0')).toBe(true)
    expect(d).toContain('C ')
    expect(d.endsWith('100 50')).toBe(true)
  })
})

describe('moveNode / translateNode', () => {
  const nodes = [node('a', 0, 0), node('b', 50, 50)]

  it('moveNode replaces the matching node position immutably', () => {
    const next = moveNode(nodes, 'a', { x: 5, y: 5 })
    expect(next).not.toBe(nodes)
    expect(next[0].position).toEqual({ x: 5, y: 5 })
    expect(next[1]).toBe(nodes[1])
  })

  it('translateNode applies a delta', () => {
    const next = translateNode(nodes, 'b', 10, -20)
    expect(next[1].position).toEqual({ x: 60, y: 30 })
    expect(next[0]).toBe(nodes[0])
  })
})

describe('addEdge', () => {
  it('appends a fresh edge', () => {
    const edges: FlowEdge[] = []
    const next = addEdge(edges, { id: 'e1', source: 'a', target: 'b' })
    expect(next).toHaveLength(1)
    expect(next[0].id).toBe('e1')
  })

  it('rejects self-loops', () => {
    const edges: FlowEdge[] = []
    const next = addEdge(edges, { id: 'e1', source: 'a', target: 'a' })
    expect(next).toBe(edges)
  })

  it('rejects exact duplicates', () => {
    const edges: FlowEdge[] = [{ id: 'e1', source: 'a', target: 'b' }]
    const next = addEdge(edges, { id: 'e2', source: 'a', target: 'b' })
    expect(next).toBe(edges)
  })

  it('allows different handle pairs between same nodes', () => {
    const edges: FlowEdge[] = [{ id: 'e1', source: 'a', target: 'b', sourceHandle: 'out1' }]
    const next = addEdge(edges, {
      id: 'e2',
      source: 'a',
      target: 'b',
      sourceHandle: 'out2',
    })
    expect(next).toHaveLength(2)
  })
})

describe('removeNode', () => {
  it('drops the node and any incident edges', () => {
    const nodes = [node('a', 0, 0), node('b', 50, 0), node('c', 100, 0)]
    const edges: FlowEdge[] = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'c' },
      { id: 'e3', source: 'a', target: 'c' },
    ]
    const next = removeNode(nodes, edges, 'b')
    expect(next.nodes.map((n) => n.id)).toEqual(['a', 'c'])
    expect(next.edges.map((e) => e.id)).toEqual(['e3'])
  })
})

describe('removeEdge', () => {
  it('filters by id', () => {
    const edges: FlowEdge[] = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'c' },
    ]
    const next = removeEdge(edges, 'e1')
    expect(next.map((e) => e.id)).toEqual(['e2'])
  })
})

describe('clientToWorld', () => {
  it('inverts pan + zoom', () => {
    // Canvas at (10,20) on screen, viewport panned (5,5), zoomed 2x.
    const rect = { left: 10, top: 20 }
    const viewport = { x: 5, y: 5, zoom: 2 }
    const w = clientToWorld(50, 60, rect, viewport)
    // (50 - 10 - 5) / 2 = 17.5;  (60 - 20 - 5) / 2 = 17.5
    expect(w).toEqual({ x: 17.5, y: 17.5 })
  })
})
