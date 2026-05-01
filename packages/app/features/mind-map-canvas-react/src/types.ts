/**
 * Mind-map domain types — the tree-structured node shape consumed by
 * `<MindMapCanvas>`. Nodes form a parent/child tree (each node has its
 * own children inline); siblings keep their declared order. The `id`
 * is opaque to the canvas — consumers pick whatever id scheme matches
 * their domain (uuid, db id, slug).
 *
 * @module
 */

import type { Point } from '@molecule/app-feature-canvas-react'

/**
 * One mind-map node. Every node is the root of its own subtree (the
 * top-level node passed as `root` is just the outermost example).
 */
export interface MindMapNode {
  /** Stable identifier — must be unique across the entire tree. */
  id: string
  /** Display text shown in the node's body. */
  text: string
  /** Direct child subtrees, rendered in array order. */
  children: MindMapNode[]
  /**
   * If `true`, the node renders without its descendants — the subtree
   * is effectively hidden until expanded. Defaults to `false`.
   */
  collapsed?: boolean
  /**
   * Optional accent color (CSS color string). Used as the inline
   * border-left accent on the node body; ClassMap drives the rest of
   * the chrome.
   */
  color?: string
}

/** Layout strategies `<MindMapCanvas>` knows how to compute. */
export type MindMapLayout = 'radial' | 'horizontal' | 'vertical'

/**
 * Result of a layout computation: a flat map of `nodeId` → canvas-space
 * top-left position, plus the parent/child pairs that should be drawn
 * as edges (in tree order, parents first). Collapsed subtrees are
 * omitted.
 */
export interface MindMapLayoutResult {
  /** Map of `nodeId` → canvas-space top-left position. */
  positions: Map<string, Point>
  /** Parent/child id pairs to draw as edges. */
  edges: Array<{ parentId: string; childId: string }>
  /** Flat list of nodes that should be rendered (i.e. not hidden by a collapsed ancestor). */
  visibleNodes: MindMapNode[]
}
