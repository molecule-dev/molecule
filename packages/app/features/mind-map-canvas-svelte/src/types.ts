/**
 * Mind-map domain types — the tree-structured node shape consumed by
 * `<MindMapCanvas>`. Nodes form a parent/child tree (each node has its
 * own children inline); siblings keep their declared order. The `id`
 * is opaque to the canvas — consumers pick whatever id scheme matches
 * their domain (uuid, db id, slug).
 *
 * @module
 */

import type { Point } from '@molecule/app-feature-canvas-svelte'

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
   * Optional accent color (CSS color string). Drawn as the inset accent
   * bar on the node body (the ClassMap `accentCard` recipe, fed through
   * the `--mol-accent` variable); ClassMap drives the rest of the chrome.
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

/** `<MindMapCanvas>` props — the React names, in Vue's idiom. */
export interface MindMapCanvasProps {
  /**
   * Root of the mind-map tree. The canvas is fully-controlled when
   * `onChange` is supplied; otherwise the component manages its own
   * mirror.
   */
  root: MindMapNode
  /**
   * Optional change callback. When provided, the canvas runs in
   * controlled mode — every fold/edit/add-child mutation calls
   * `onChange(nextRoot)` and the parent decides whether to commit.
   */
  onChange?: (next: MindMapNode) => void
  /** Layout strategy. Defaults to `'radial'`. */
  layout?: MindMapLayout
  /** Width of the surface in CSS pixels. Defaults to `800`. */
  width?: number
  /** Height of the surface in CSS pixels. Defaults to `600`. */
  height?: number
  /** Node width in canvas units. Defaults to {@link DEFAULT_NODE_WIDTH}. */
  nodeWidth?: number
  /** Node height in canvas units. Defaults to {@link DEFAULT_NODE_HEIGHT}. */
  nodeHeight?: number
  /** Fired when a node is clicked (single click, no drag). */
  onNodeClick?: (node: MindMapNode) => void
  /**
   * Fired when a node's text is committed via inline edit. Receives the
   * node id and the new text. Useful for analytics / autosave.
   */
  onNodeEdit?: (id: string, text: string) => void
  /** Extra classes merged onto the outer wrapper. */
  className?: string
}
