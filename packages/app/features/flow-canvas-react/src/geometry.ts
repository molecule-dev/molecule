import type { FlowEdge, FlowNode, FlowPoint } from './types.js'

/**
 * Pure geometry helpers used by `<FlowCanvas>`. Extracted so the math is
 * unit-testable without React / jsdom.
 *
 * @module
 */

/** Default node width when `node.width` is unset. */
export const DEFAULT_NODE_WIDTH = 180
/** Default node height when `node.height` is unset. */
export const DEFAULT_NODE_HEIGHT = 80

/**
 * World-space coordinates of a node's default source port (right edge,
 * vertically centred). Used when `edge.sourceHandle` is unset.
 *
 * @param node - The source node.
 * @returns Centre-right anchor point in world coordinates.
 */
export function defaultSourcePort(node: FlowNode): FlowPoint {
  const w = node.width ?? DEFAULT_NODE_WIDTH
  const h = node.height ?? DEFAULT_NODE_HEIGHT
  return { x: node.position.x + w, y: node.position.y + h / 2 }
}

/**
 * World-space coordinates of a node's default target port (left edge,
 * vertically centred). Used when `edge.targetHandle` is unset.
 *
 * @param node - The target node.
 * @returns Centre-left anchor point in world coordinates.
 */
export function defaultTargetPort(node: FlowNode): FlowPoint {
  const h = node.height ?? DEFAULT_NODE_HEIGHT
  return { x: node.position.x, y: node.position.y + h / 2 }
}

/**
 * Build a smooth horizontal cubic-Bezier SVG path between two world
 * points, with handles tugged horizontally for a "flow chart" feel.
 *
 * @param a - Start point (source).
 * @param b - End point (target).
 * @returns SVG `d` attribute string.
 */
export function bezierPath(a: FlowPoint, b: FlowPoint): string {
  const dx = Math.max(40, Math.abs(b.x - a.x) * 0.5)
  const c1x = a.x + dx
  const c2x = b.x - dx
  return `M ${a.x} ${a.y} C ${c1x} ${a.y}, ${c2x} ${b.y}, ${b.x} ${b.y}`
}

/**
 * Move a single node to a new absolute position (immutably).
 *
 * @param nodes - Current node list.
 * @param id - Node id to move.
 * @param position - New world-space top-left.
 * @returns New node array (same length, with the matching node updated).
 */
export function moveNode(nodes: FlowNode[], id: string, position: FlowPoint): FlowNode[] {
  return nodes.map((n) => (n.id === id ? { ...n, position } : n))
}

/**
 * Apply a delta (in world units) to a node's position.
 *
 * @param nodes - Current node list.
 * @param id - Node id to translate.
 * @param dx - Horizontal delta.
 * @param dy - Vertical delta.
 * @returns New node array.
 */
export function translateNode(nodes: FlowNode[], id: string, dx: number, dy: number): FlowNode[] {
  return nodes.map((n) =>
    n.id === id ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } } : n,
  )
}

/**
 * Remove a node and any edges connected to it.
 *
 * @param nodes - Current node list.
 * @param edges - Current edge list.
 * @param id - Node id to remove.
 * @returns Pruned `{ nodes, edges }`.
 */
export function removeNode(
  nodes: FlowNode[],
  edges: FlowEdge[],
  id: string,
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  return {
    nodes: nodes.filter((n) => n.id !== id),
    edges: edges.filter((e) => e.source !== id && e.target !== id),
  }
}

/**
 * Remove a single edge by id (immutably).
 *
 * @param edges - Current edge list.
 * @param id - Edge id to drop.
 * @returns Filtered edge array.
 */
export function removeEdge(edges: FlowEdge[], id: string): FlowEdge[] {
  return edges.filter((e) => e.id !== id)
}

/**
 * Append a new edge — guarding against self-loops and exact duplicates.
 *
 * @param edges - Current edge list.
 * @param edge - Candidate edge.
 * @returns New edge array; returns `edges` unchanged if the edge would
 *   self-loop or duplicate an existing source/target/handle pair.
 */
export function addEdge(edges: FlowEdge[], edge: FlowEdge): FlowEdge[] {
  if (edge.source === edge.target) return edges
  const dup = edges.some(
    (e) =>
      e.source === edge.source &&
      e.target === edge.target &&
      e.sourceHandle === edge.sourceHandle &&
      e.targetHandle === edge.targetHandle,
  )
  if (dup) return edges
  return [...edges, edge]
}

/**
 * Convert a screen-space pointer event coordinate into world-space
 * (canvas-local) coordinates given the current viewport pan + zoom and
 * the canvas element's bounding rect.
 *
 * @param clientX - Pointer event clientX.
 * @param clientY - Pointer event clientY.
 * @param rect - The canvas root's `getBoundingClientRect()`.
 * @param viewport - Current pan + zoom.
 * @returns World-space point.
 */
export function clientToWorld(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number },
  viewport: { x: number; y: number; zoom: number },
): FlowPoint {
  return {
    x: (clientX - rect.left - viewport.x) / viewport.zoom,
    y: (clientY - rect.top - viewport.y) / viewport.zoom,
  }
}
