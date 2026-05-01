/**
 * Pure layout algorithms for `<MindMapCanvas>`. Each algorithm walks the
 * tree, skips subtrees rooted at a `collapsed` node, and assigns every
 * visible node a canvas-space top-left position. Pure functions — no
 * side effects, no DOM access.
 *
 * Two strategies ship in-package:
 *   - `computeRadialPositions` — root at the center, children fanned
 *     out radially, each generation on its own concentric ring.
 *   - `computeHorizontalTreePositions` — classic left-to-right tidy
 *     tree (works in either axis direction via the `direction` arg).
 *
 * @module
 */

import type { Point } from '@molecule/app-feature-canvas-react'

import type { MindMapLayoutResult, MindMapNode } from './types.js'

/** Default canvas-space size of one node, used to space siblings. */
export const DEFAULT_NODE_WIDTH = 160
/** Default canvas-space height of one node. */
export const DEFAULT_NODE_HEIGHT = 48
/** Default radial ring spacing in canvas units. */
export const DEFAULT_RADIAL_RING = 180
/** Default horizontal tree per-generation step in canvas units. */
export const DEFAULT_HORIZONTAL_STEP_X = 220
/** Default horizontal tree per-leaf step in canvas units. */
export const DEFAULT_HORIZONTAL_STEP_Y = 72

/** Per-layout knobs (all optional). */
export interface LayoutOptions {
  /** Node width in canvas units. */
  nodeWidth?: number
  /** Node height in canvas units. */
  nodeHeight?: number
  /** Distance between concentric rings (radial layout). */
  ringSpacing?: number
  /** Horizontal step between generations (horizontal/vertical layout). */
  stepX?: number
  /** Vertical step between sibling subtrees (horizontal layout). */
  stepY?: number
  /** Origin in canvas-space for the root node's center. Defaults to `(0, 0)`. */
  origin?: Point
}

/**
 * Walk the tree and call `visit(node, parent | null, depth)` for every
 * node not hidden by a collapsed ancestor. Visits in pre-order.
 *
 * @param root - Tree root.
 * @param visit - Callback invoked once per visible node.
 */
export function walkVisible(
  root: MindMapNode,
  visit: (node: MindMapNode, parent: MindMapNode | null, depth: number) => void,
): void {
  function rec(node: MindMapNode, parent: MindMapNode | null, depth: number): void {
    visit(node, parent, depth)
    if (node.collapsed) return
    for (const child of node.children) rec(child, node, depth + 1)
  }
  rec(root, null, 0)
}

/**
 * Count the number of leaves in a subtree (ignoring `collapsed`
 * subtrees, which contribute one leaf for the collapsed node itself).
 *
 * @param node - Subtree root.
 * @returns The number of visible leaves under `node`.
 */
function countLeaves(node: MindMapNode): number {
  if (node.collapsed || node.children.length === 0) return 1
  let n = 0
  for (const child of node.children) n += countLeaves(child)
  return n
}

/**
 * Radial layout: root at `origin`, children fan out around it at
 * uniform angles, each generation living on its own concentric ring.
 * For deeper generations the angular slice of each child is its
 * parent's slice divided by the parent's child count.
 *
 * @param root - Tree root.
 * @param options - Optional layout knobs.
 * @returns Layout result with positions, edges, and the visible-node list.
 */
export function computeRadialPositions(
  root: MindMapNode,
  options: LayoutOptions = {},
): MindMapLayoutResult {
  const ring = options.ringSpacing ?? DEFAULT_RADIAL_RING
  const w = options.nodeWidth ?? DEFAULT_NODE_WIDTH
  const h = options.nodeHeight ?? DEFAULT_NODE_HEIGHT
  const origin = options.origin ?? { x: 0, y: 0 }

  const positions = new Map<string, Point>()
  const edges: Array<{ parentId: string; childId: string }> = []
  const visibleNodes: MindMapNode[] = []

  // Root sits at the origin (top-left aligned so its center == origin).
  positions.set(root.id, { x: origin.x - w / 2, y: origin.y - h / 2 })
  visibleNodes.push(root)

  /**
   * Recursively place children of `node` on the next ring out, splitting
   * the angular slice `[startAngle, endAngle]` evenly across them.
   *
   * @param node - Subtree root currently being laid out.
   * @param depth - Generation index (root = 0).
   * @param startAngle - Inclusive start of this subtree's angular slice (radians).
   * @param endAngle - Exclusive end of this subtree's angular slice (radians).
   */
  function place(node: MindMapNode, depth: number, startAngle: number, endAngle: number): void {
    if (node.collapsed) return
    const children = node.children
    if (children.length === 0) return
    const total = children.length
    const span = endAngle - startAngle
    const slice = span / total
    for (let i = 0; i < total; i++) {
      const child = children[i]
      const childStart = startAngle + slice * i
      const childEnd = childStart + slice
      const angle = (childStart + childEnd) / 2
      const radius = ring * (depth + 1)
      const cx = origin.x + Math.cos(angle) * radius
      const cy = origin.y + Math.sin(angle) * radius
      positions.set(child.id, { x: cx - w / 2, y: cy - h / 2 })
      edges.push({ parentId: node.id, childId: child.id })
      visibleNodes.push(child)
      place(child, depth + 1, childStart, childEnd)
    }
  }

  place(root, 0, 0, Math.PI * 2)
  return { positions, edges, visibleNodes }
}

/**
 * Horizontal tidy-tree layout: root on the left, children fan out to
 * the right, each subtree's children stacked vertically with enough
 * room for every leaf descendant. The `axis` option swaps the role
 * of the X and Y axes for a vertical (top-down) tree.
 *
 * @param root - Tree root.
 * @param options - Optional layout knobs.
 * @param axis - `'horizontal'` (default) places generations along +X;
 *   `'vertical'` places generations along +Y.
 * @returns Layout result with positions, edges, and the visible-node list.
 */
export function computeHorizontalTreePositions(
  root: MindMapNode,
  options: LayoutOptions = {},
  axis: 'horizontal' | 'vertical' = 'horizontal',
): MindMapLayoutResult {
  const stepX = options.stepX ?? DEFAULT_HORIZONTAL_STEP_X
  const stepY = options.stepY ?? DEFAULT_HORIZONTAL_STEP_Y
  const w = options.nodeWidth ?? DEFAULT_NODE_WIDTH
  const h = options.nodeHeight ?? DEFAULT_NODE_HEIGHT
  const origin = options.origin ?? { x: 0, y: 0 }

  const positions = new Map<string, Point>()
  const edges: Array<{ parentId: string; childId: string }> = []
  const visibleNodes: MindMapNode[] = []

  // The leaf cursor advances by `stepY` for every leaf placed; subtree
  // positions are the average of their first and last leaves.
  let leafCursor = 0

  /**
   * Place `node` and all descendants. Returns the cross-axis coordinate
   * of `node` (in canvas units, before adding `origin`).
   *
   * @param node - Subtree root.
   * @param depth - Generation index (root = 0).
   * @returns Cross-axis coordinate of `node`'s center.
   */
  function place(node: MindMapNode, depth: number): number {
    visibleNodes.push(node)
    if (node.collapsed || node.children.length === 0) {
      const cross = leafCursor * stepY
      leafCursor += 1
      writePosition(node, depth, cross)
      return cross
    }
    const childCrosses: number[] = []
    for (const child of node.children) {
      childCrosses.push(place(child, depth + 1))
      edges.push({ parentId: node.id, childId: child.id })
    }
    const cross = (childCrosses[0] + childCrosses[childCrosses.length - 1]) / 2
    writePosition(node, depth, cross)
    return cross
  }

  /**
   * Write `node`'s top-left position into the positions map, projecting
   * `(depth, cross)` through the chosen axis orientation.
   *
   * @param node - Node to position.
   * @param depth - Generation index.
   * @param cross - Cross-axis coordinate (along the perpendicular axis).
   */
  function writePosition(node: MindMapNode, depth: number, cross: number): void {
    if (axis === 'horizontal') {
      positions.set(node.id, {
        x: origin.x + depth * stepX - w / 2,
        y: origin.y + cross - h / 2,
      })
    } else {
      positions.set(node.id, {
        x: origin.x + cross - w / 2,
        y: origin.y + depth * stepX - h / 2,
      })
    }
  }

  // Make the root's cross-axis center `0` in canvas space by shifting
  // every position by `-rootCross` after layout. We do that in two
  // passes for clarity.
  const rootCross = place(root, 0)
  if (rootCross !== 0) {
    for (const [id, p] of positions) {
      if (axis === 'horizontal') positions.set(id, { x: p.x, y: p.y - rootCross })
      else positions.set(id, { x: p.x - rootCross, y: p.y })
    }
  }

  // Suppress an unused-arg lint flag — leaves count is implicit in the
  // cursor and is intentionally not exposed.
  void countLeaves

  return { positions, edges, visibleNodes }
}
