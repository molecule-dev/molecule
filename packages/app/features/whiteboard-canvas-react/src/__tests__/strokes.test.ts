import { describe, expect, it } from 'vitest'

import {
  applyEraserStrokes,
  buildShapePath,
  buildStrokePath,
  defaultShapeStyle,
  defaultStickyNoteStyle,
  defaultStrokeColor,
  defaultStrokeWidth,
  generateWhiteboardId,
  segmentsIntersect,
  shapeBounds,
  strokeIntersectsPath,
} from '../strokes.js'
import type { WhiteboardShape, WhiteboardStroke } from '../types.js'

describe('generateWhiteboardId', () => {
  it('returns a non-empty string', () => {
    expect(generateWhiteboardId().length).toBeGreaterThan(0)
  })

  it('returns distinct ids on successive calls', () => {
    const a = generateWhiteboardId()
    const b = generateWhiteboardId()
    expect(a).not.toBe(b)
  })
})

describe('buildStrokePath', () => {
  it('returns "" for empty input', () => {
    expect(buildStrokePath([])).toBe('')
  })

  it('returns a single moveto for one point', () => {
    expect(buildStrokePath([{ x: 1, y: 2 }])).toBe('M 1 2')
  })

  it('returns a moveto + lineto for two points', () => {
    expect(
      buildStrokePath([
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ]),
    ).toBe('M 0 0 L 10 10')
  })

  it('emits Q segments + final L for >= 3 points', () => {
    const path = buildStrokePath([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 10 },
      { x: 30, y: 0 },
    ])
    // Starts with moveto, contains at least one Q, ends with the final L.
    expect(path.startsWith('M 0 0')).toBe(true)
    expect(path).toMatch(/ Q /)
    expect(path).toMatch(/L 30 0$/)
  })
})

describe('shapeBounds', () => {
  it('normalises negative-direction draws', () => {
    const shape: WhiteboardShape = {
      id: 'a',
      kind: 'rect',
      from: { x: 100, y: 100 },
      to: { x: 50, y: 70 },
      stroke: '#000',
      strokeWidth: 1,
    }
    expect(shapeBounds(shape)).toEqual({ x: 50, y: 70, width: 50, height: 30 })
  })
})

describe('buildShapePath', () => {
  const base = (kind: WhiteboardShape['kind']): WhiteboardShape => ({
    id: 'x',
    kind,
    from: { x: 0, y: 0 },
    to: { x: 10, y: 10 },
    stroke: '#000',
    strokeWidth: 1,
  })

  it('builds a straight line for kind=line', () => {
    expect(buildShapePath(base('line'))).toBe('M 0 0 L 10 10')
  })

  it('appends arrow barbs for kind=arrow', () => {
    const path = buildShapePath(base('arrow'))
    expect(path.startsWith('M 0 0 L 10 10')).toBe(true)
    // Shaft + barb subpath → 2 moveto commands.
    expect((path.match(/M /g) ?? []).length).toBe(2)
    // Two L commands for the barbs converging on the tip.
    const lCount = (path.match(/L /g) ?? []).length
    expect(lCount).toBeGreaterThanOrEqual(3)
  })

  it('builds a closed rect path', () => {
    const path = buildShapePath(base('rect'))
    expect(path).toBe('M 0 0 h 10 v 10 h -10 Z')
  })

  it('builds a closed ellipse path', () => {
    const path = buildShapePath(base('ellipse'))
    // Ellipse uses two arc commands to form a full circle/oval.
    expect(path).toMatch(/^M /)
    expect(path).toMatch(/a /)
    expect(path).toMatch(/Z$/)
  })
})

describe('default style helpers', () => {
  it('marker has the largest pen-family stroke width', () => {
    expect(defaultStrokeWidth('marker')).toBeGreaterThan(defaultStrokeWidth('pen'))
  })

  it('eraser has the largest stroke width overall', () => {
    expect(defaultStrokeWidth('eraser')).toBeGreaterThan(defaultStrokeWidth('marker'))
  })

  it('stroke colors are non-empty CSS strings', () => {
    expect(defaultStrokeColor('pen')).toMatch(/^#|rgb/)
    expect(defaultStrokeColor('marker')).toMatch(/^#|rgb/)
    expect(defaultStrokeColor('eraser')).toMatch(/^#|rgb/)
  })

  it('rect / ellipse styles include a fill key', () => {
    expect(defaultShapeStyle('rect').fill).toBeDefined()
    expect(defaultShapeStyle('ellipse').fill).toBeDefined()
  })

  it('line / arrow styles do not include a fill', () => {
    expect(defaultShapeStyle('line').fill).toBeUndefined()
    expect(defaultShapeStyle('arrow').fill).toBeUndefined()
  })

  it('sticky note default has positive size + colors', () => {
    const s = defaultStickyNoteStyle()
    expect(s.width).toBeGreaterThan(0)
    expect(s.height).toBeGreaterThan(0)
    expect(s.background.length).toBeGreaterThan(0)
    expect(s.color.length).toBeGreaterThan(0)
  })
})

describe('segmentsIntersect', () => {
  it('detects crossing segments', () => {
    expect(
      segmentsIntersect({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 }),
    ).toBe(true)
  })

  it('returns false for parallel non-touching segments', () => {
    expect(
      segmentsIntersect({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 5 }, { x: 10, y: 5 }),
    ).toBe(false)
  })
})

describe('applyEraserStrokes', () => {
  const stroke = (
    id: string,
    kind: WhiteboardStroke['kind'],
    points: { x: number; y: number }[],
  ): WhiteboardStroke => ({
    id,
    kind,
    points,
    color: '#000',
    width: 2,
  })

  it('removes earlier strokes that an eraser crosses', () => {
    const strokes: WhiteboardStroke[] = [
      stroke('pen-1', 'pen', [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ]),
      stroke('pen-2', 'pen', [
        { x: 0, y: 50 },
        { x: 100, y: 50 },
      ]),
      stroke('eraser-1', 'eraser', [
        { x: 50, y: -10 },
        { x: 50, y: 10 },
      ]),
    ]
    const result = applyEraserStrokes(strokes)
    // First pen line is crossed by the eraser → dropped.
    // Second pen line at y=50 is not crossed → kept.
    expect(result.map((s) => s.id)).toEqual(['pen-2'])
    // Erasers themselves are dropped from the survivor list.
    expect(result.every((s) => s.kind !== 'eraser')).toBe(true)
  })

  it('keeps strokes the eraser doesn’t cross', () => {
    const strokes: WhiteboardStroke[] = [
      stroke('pen-1', 'pen', [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ]),
      stroke('eraser-1', 'eraser', [
        { x: 200, y: 200 },
        { x: 210, y: 210 },
      ]),
    ]
    expect(applyEraserStrokes(strokes).map((s) => s.id)).toEqual(['pen-1'])
  })

  it('strokeIntersectsPath returns false for a non-eraser left-arg', () => {
    const a = stroke('pen', 'pen', [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ])
    const b = stroke('pen', 'pen', [
      { x: 0, y: 10 },
      { x: 10, y: 0 },
    ])
    expect(strokeIntersectsPath(a, b)).toBe(false)
  })
})
