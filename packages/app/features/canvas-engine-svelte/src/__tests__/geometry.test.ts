import { describe, expect, it } from 'vitest'

import {
  combinedBounds,
  elementBounds,
  findElement,
  rectsIntersect,
  snapToGrid,
  translateElement,
  unionBounds,
} from '../geometry.js'
import type { VectorElement } from '../types.js'

describe('snapToGrid', () => {
  it('snaps positive values to the nearest multiple', () => {
    expect(snapToGrid(7, 8)).toBe(8)
    expect(snapToGrid(11, 8)).toBe(8)
    expect(snapToGrid(13, 8)).toBe(16)
  })

  it('passes the value through when grid <= 0', () => {
    expect(snapToGrid(13, 0)).toBe(13)
    expect(snapToGrid(13, -4)).toBe(13)
  })
})

describe('elementBounds', () => {
  it('returns the bounding-box for shapes', () => {
    const rect: VectorElement = {
      id: 'a',
      kind: 'rect',
      x: 10,
      y: 20,
      width: 30,
      height: 40,
    }
    expect(elementBounds(rect)).toEqual({ x: 10, y: 20, width: 30, height: 40 })
  })

  it('uses endpoints for lines', () => {
    const line: VectorElement = {
      id: 'l',
      kind: 'line',
      x1: 5,
      y1: 100,
      x2: 50,
      y2: 10,
    }
    expect(elementBounds(line)).toEqual({ x: 5, y: 10, width: 45, height: 90 })
  })
})

describe('unionBounds + combinedBounds', () => {
  it('combines two boxes into the smallest enclosing rect', () => {
    expect(
      unionBounds({ x: 0, y: 0, width: 10, height: 10 }, { x: 5, y: 8, width: 20, height: 4 }),
    ).toEqual({ x: 0, y: 0, width: 25, height: 12 })
  })

  it('returns zero-rect for empty inputs', () => {
    expect(combinedBounds([])).toEqual({ x: 0, y: 0, width: 0, height: 0 })
  })

  it('handles a single-element list', () => {
    const rect: VectorElement = {
      id: 'a',
      kind: 'rect',
      x: 1,
      y: 2,
      width: 3,
      height: 4,
    }
    expect(combinedBounds([rect])).toEqual({ x: 1, y: 2, width: 3, height: 4 })
  })
})

describe('rectsIntersect', () => {
  it('detects overlap', () => {
    expect(
      rectsIntersect({ x: 0, y: 0, width: 10, height: 10 }, { x: 5, y: 5, width: 20, height: 20 }),
    ).toBe(true)
  })

  it('detects clear separation', () => {
    expect(
      rectsIntersect(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 100, y: 100, width: 5, height: 5 },
      ),
    ).toBe(false)
  })
})

describe('translateElement', () => {
  it('translates rect by (dx, dy)', () => {
    const rect: VectorElement = {
      id: 'a',
      kind: 'rect',
      x: 10,
      y: 20,
      width: 5,
      height: 5,
    }
    const moved = translateElement(rect, 4, -2)
    expect(moved).toMatchObject({ x: 14, y: 18, width: 5, height: 5 })
  })

  it('translates lines on both endpoints', () => {
    const line: VectorElement = {
      id: 'l',
      kind: 'line',
      x1: 0,
      y1: 0,
      x2: 10,
      y2: 10,
    }
    expect(translateElement(line, 5, 5)).toMatchObject({
      x1: 5,
      y1: 5,
      x2: 15,
      y2: 15,
    })
  })

  it('translates groups recursively', () => {
    const group: VectorElement = {
      id: 'g',
      kind: 'group',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      children: [
        { id: 'a', kind: 'rect', x: 0, y: 0, width: 5, height: 5 },
        { id: 'b', kind: 'rect', x: 5, y: 5, width: 5, height: 5 },
      ],
    }
    const moved = translateElement(group, 2, 3) as Extract<VectorElement, { kind: 'group' }>
    expect(moved.x).toBe(2)
    expect(moved.y).toBe(3)
    expect(moved.children[0]).toMatchObject({ x: 2, y: 3 })
    expect(moved.children[1]).toMatchObject({ x: 7, y: 8 })
  })
})

describe('findElement', () => {
  it('returns the matching element', () => {
    const a: VectorElement = { id: 'a', kind: 'rect', x: 0, y: 0, width: 1, height: 1 }
    const b: VectorElement = { id: 'b', kind: 'rect', x: 0, y: 0, width: 1, height: 1 }
    expect(findElement([a, b], 'b')).toBe(b)
    expect(findElement([a, b], 'missing')).toBeUndefined()
  })
})
