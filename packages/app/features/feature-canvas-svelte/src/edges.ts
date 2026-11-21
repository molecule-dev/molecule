/**
 * Pure SVG edge-path builder shared by the Svelte `<CanvasEdge>`.
 *
 * @module
 */

import type { CanvasEdgeKind, Point } from './types.js'

/**
 * Build the SVG `path` `d` attribute for one of the supported edge kinds.
 *
 * @param from - Edge start in canvas-space.
 * @param to - Edge end in canvas-space.
 * @param kind - Edge geometry.
 * @returns SVG path data.
 */
export function buildEdgePath(from: Point, to: Point, kind: CanvasEdgeKind): string {
  if (kind === 'orthogonal') {
    return `M ${from.x} ${from.y} L ${to.x} ${from.y} L ${to.x} ${to.y}`
  }
  if (kind === 'bezier') {
    const handle = Math.max(20, Math.abs(to.x - from.x) / 2)
    const c1x = from.x + handle
    const c1y = from.y
    const c2x = to.x - handle
    const c2y = to.y
    return `M ${from.x} ${from.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${to.x} ${to.y}`
  }
  // 'line'
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`
}
