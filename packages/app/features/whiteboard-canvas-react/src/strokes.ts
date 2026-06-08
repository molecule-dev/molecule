/**
 * Pure geometry utilities for the whiteboard canvas: stroke smoothing,
 * shape bounds, sticky-note defaults, eraser diffing, id generation.
 * No React, no DOM — fully unit-testable.
 *
 * @module
 */

import type { Point } from '@molecule/app-feature-canvas-react'

import type {
  WhiteboardShape,
  WhiteboardShapeKind,
  WhiteboardStickyNote,
  WhiteboardStroke,
  WhiteboardStrokeKind,
} from './types.js'

/**
 * Generate an `id` unique enough for in-process selection + realtime
 * broadcast. Not cryptographic. Falls back gracefully when
 * `crypto.randomUUID` is unavailable (older Node, jsdom).
 *
 * @returns A short unique id string.
 */
export function generateWhiteboardId(): string {
  // `crypto` is available in modern browsers + Node 19+; jsdom 27 has it
  // too. Guard for the rare cases where it isn't.
  const cryptoObj: { randomUUID?: () => string } | undefined =
    typeof globalThis !== 'undefined'
      ? (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
      : undefined
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID()
  return `wb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Build an SVG path string for a free-form stroke using quadratic
 * Bezier midpoints — the standard "smooth pen" technique. Each
 * intermediate point becomes a control point and the midpoint between
 * adjacent points becomes the curve endpoint, which produces a
 * smoothly-tangent path even from sparse pointer samples.
 *
 * Returns an empty string for zero-point strokes and a single
 * `M`-command for one-point strokes (so renderers can still emit a
 * dot).
 *
 * @param points - Raw sampled canvas-space points.
 * @returns An SVG path data string.
 */
export function buildStrokePath(points: readonly Point[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`
  }
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
  }
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i]
    const next = points[i + 1]
    const midX = (p.x + next.x) / 2
    const midY = (p.y + next.y) / 2
    d += ` Q ${p.x} ${p.y} ${midX} ${midY}`
  }
  // Close out with a line to the final sampled point so the stroke
  // doesn't end on a midpoint.
  const last = points[points.length - 1]
  d += ` L ${last.x} ${last.y}`
  return d
}

/**
 * Default stroke width in canvas units for a given tool. Marker is
 * intentionally fixed to communicate "highlighter"; pen / eraser are
 * thinner / wider.
 *
 * @param kind - Stroke tool kind.
 * @returns Default canvas-space stroke width.
 */
export function defaultStrokeWidth(kind: WhiteboardStrokeKind): number {
  switch (kind) {
    case 'pen':
      return 2
    case 'marker':
      return 14
    case 'eraser':
      return 24
  }
}

/**
 * Default color for a given stroke tool.
 *
 * @param kind - Stroke tool kind.
 * @returns A CSS color string.
 */
export function defaultStrokeColor(kind: WhiteboardStrokeKind): string {
  switch (kind) {
    case 'pen':
      return '#1f2937'
    case 'marker':
      return 'rgba(250, 204, 21, 0.55)'
    case 'eraser':
      // Erasers don't render a visible color when applied — but for
      // in-flight UI feedback we use a light "knock-out" halo.
      return 'rgba(255, 255, 255, 0.6)'
  }
}

/**
 * Compute the axis-aligned bounding rect of a vector shape's two
 * canvas-space corner points. Useful for hit-testing and rendering
 * `rect` / `ellipse`.
 *
 * @param shape - The vector shape.
 * @returns `{ x, y, width, height }` in canvas-space.
 */
export function shapeBounds(shape: WhiteboardShape): {
  x: number
  y: number
  width: number
  height: number
} {
  const x = Math.min(shape.from.x, shape.to.x)
  const y = Math.min(shape.from.y, shape.to.y)
  const width = Math.abs(shape.to.x - shape.from.x)
  const height = Math.abs(shape.to.y - shape.from.y)
  return { x, y, width, height }
}

/**
 * Build SVG path data for a vector shape — straight segment for
 * `line`, segment with a small arrowhead for `arrow`. `rect` and
 * `ellipse` are typically rendered as their own SVG elements; this
 * helper still returns a closed path for them so consumers can
 * fall back to `<path>` if desired.
 *
 * @param shape - The vector shape.
 * @returns An SVG path data string.
 */
export function buildShapePath(shape: WhiteboardShape): string {
  const { from, to, kind } = shape
  switch (kind) {
    case 'line':
      return `M ${from.x} ${from.y} L ${to.x} ${to.y}`
    case 'arrow': {
      // Tip at `to`; barb at ~12 canvas units, 25-degree half-angle.
      const dx = to.x - from.x
      const dy = to.y - from.y
      const len = Math.hypot(dx, dy) || 1
      const ux = dx / len
      const uy = dy / len
      const barb = 12
      const angle = Math.PI / 7 // ~25.7°
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      // Rotate the unit vector by ±angle and walk back from `to`.
      const leftX = to.x - barb * (ux * cos - uy * sin)
      const leftY = to.y - barb * (uy * cos + ux * sin)
      const rightX = to.x - barb * (ux * cos + uy * sin)
      const rightY = to.y - barb * (uy * cos - ux * sin)
      return (
        `M ${from.x} ${from.y} L ${to.x} ${to.y} ` +
        `M ${leftX} ${leftY} L ${to.x} ${to.y} L ${rightX} ${rightY}`
      )
    }
    case 'rect': {
      const b = shapeBounds(shape)
      return `M ${b.x} ${b.y} h ${b.width} v ${b.height} h ${-b.width} Z`
    }
    case 'ellipse': {
      const b = shapeBounds(shape)
      const rx = b.width / 2
      const ry = b.height / 2
      const cx = b.x + rx
      const cy = b.y + ry
      return (
        `M ${cx - rx} ${cy} ` +
        `a ${rx} ${ry} 0 1 0 ${rx * 2} 0 ` +
        `a ${rx} ${ry} 0 1 0 ${-rx * 2} 0 Z`
      )
    }
  }
}

/**
 * Default fill / stroke palette per shape kind. Consumers override via
 * direct prop assignment; this is just the initial-tap default.
 *
 * @param kind - Shape kind.
 * @returns `{ stroke, strokeWidth, fill }` defaults.
 */
export function defaultShapeStyle(kind: WhiteboardShapeKind): {
  stroke: string
  strokeWidth: number
  fill?: string
} {
  switch (kind) {
    case 'line':
    case 'arrow':
      return { stroke: '#1f2937', strokeWidth: 2 }
    case 'rect':
    case 'ellipse':
      return { stroke: '#1f2937', strokeWidth: 2, fill: 'rgba(255, 255, 255, 0.0)' }
  }
}

/**
 * Default sticky-note size + colors. Plain text-tool consumers can
 * override `background` to a transparent value.
 *
 * @returns Default sticky-note metrics + palette.
 */
export function defaultStickyNoteStyle(): {
  width: number
  height: number
  background: string
  color: string
} {
  return {
    width: 160,
    height: 120,
    background: '#fef08a',
    color: '#1f2937',
  }
}

/**
 * Test whether two segments intersect using the standard CCW
 * orientation test. Used by {@link strokeIntersectsPath} for eraser
 * hit-testing against existing strokes.
 *
 * Collinear endpoints only count when the bounding boxes also
 * overlap — otherwise two parallel-but-distant segments would
 * register as touching just because every CCW determinant is zero.
 *
 * @param a1 - First segment start.
 * @param a2 - First segment end.
 * @param b1 - Second segment start.
 * @param b2 - Second segment end.
 * @returns `true` if the segments cross or share a touching point.
 */
export function segmentsIntersect(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
  const ccw = (p: Point, q: Point, r: Point): number =>
    (r.y - p.y) * (q.x - p.x) - (q.y - p.y) * (r.x - p.x)
  const d1 = ccw(b1, b2, a1)
  const d2 = ccw(b1, b2, a2)
  const d3 = ccw(a1, a2, b1)
  const d4 = ccw(a1, a2, b2)
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true
  }
  // Collinear case — require bounding-box overlap before declaring a hit.
  const onSegment = (p: Point, q: Point, r: Point): boolean =>
    Math.min(p.x, r.x) <= q.x &&
    q.x <= Math.max(p.x, r.x) &&
    Math.min(p.y, r.y) <= q.y &&
    q.y <= Math.max(p.y, r.y)
  if (d1 === 0 && onSegment(b1, a1, b2)) return true
  if (d2 === 0 && onSegment(b1, a2, b2)) return true
  if (d3 === 0 && onSegment(a1, b1, a2)) return true
  if (d4 === 0 && onSegment(a1, b2, a2)) return true
  return false
}

/**
 * `true` if the eraser stroke `eraser` crosses any segment of `target`
 * within `tolerance` canvas units. Used by {@link applyEraserStrokes}
 * to diff erasers against earlier strokes.
 *
 * @param eraser - Eraser stroke (path of points).
 * @param target - Target stroke to test against.
 * @returns `true` when the two paths cross.
 */
export function strokeIntersectsPath(eraser: WhiteboardStroke, target: WhiteboardStroke): boolean {
  if (eraser.kind !== 'eraser') return false
  if (eraser.points.length === 0 || target.points.length === 0) return false
  for (let i = 0; i < eraser.points.length - 1; i++) {
    const e1 = eraser.points[i]
    const e2 = eraser.points[i + 1]
    for (let j = 0; j < target.points.length - 1; j++) {
      const t1 = target.points[j]
      const t2 = target.points[j + 1]
      if (segmentsIntersect(e1, e2, t1, t2)) return true
    }
  }
  return false
}

/**
 * Apply every eraser stroke in `strokes` against the non-eraser
 * strokes that came before it. Returns a new array containing only
 * the surviving non-eraser strokes — useful when persisting a
 * snapshot or compacting an undo history.
 *
 * Erasers themselves are dropped from the result; consumers that need
 * to keep them for replay should diff manually.
 *
 * @param strokes - The full chronological stroke list.
 * @returns Surviving non-eraser strokes (eraser entries removed).
 */
export function applyEraserStrokes(strokes: readonly WhiteboardStroke[]): WhiteboardStroke[] {
  const result: WhiteboardStroke[] = []
  for (const stroke of strokes) {
    if (stroke.kind === 'eraser') {
      // Drop any previously-kept stroke that this eraser intersects.
      for (let i = result.length - 1; i >= 0; i--) {
        if (strokeIntersectsPath(stroke, result[i])) {
          result.splice(i, 1)
        }
      }
      continue
    }
    result.push(stroke)
  }
  return result
}

// Type-only re-exports so consumers can do
// `import type { WhiteboardStickyNote } from '@molecule/app-whiteboard-canvas-react'`
// without separately importing types.js — purely a developer ergonomic.
export type {
  WhiteboardShape,
  WhiteboardShapeKind,
  WhiteboardStickyNote,
  WhiteboardStroke,
  WhiteboardStrokeKind,
}
