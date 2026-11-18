import type { JSX } from 'solid-js'

/**
 * Flow-canvas types: nodes, edges, and the controlled / uncontrolled
 * change events emitted by `<FlowCanvas>` — the Solid counterpart of
 * `@molecule/app-flow-canvas-react`'s types, with the same field names.
 *
 * @module
 */

/** A 2-D point in canvas (world) coordinates. */
export interface FlowPoint {
  /** X coordinate. */
  x: number
  /** Y coordinate. */
  y: number
}

/**
 * Single node on the canvas.
 *
 * `data` is opaque to the canvas — it's passed back to the renderer the
 * consumer registers for the matching `type`.
 */
export interface FlowNode<T = unknown> {
  /** Unique node id. */
  id: string
  /** Discriminator the consumer uses to pick a renderer. */
  type: string
  /** World-space top-left of the node. */
  position: FlowPoint
  /** Free-form payload echoed back to the renderer. */
  data?: T
  /** Optional explicit width (in world units). Defaults to 180. */
  width?: number
  /** Optional explicit height (in world units). Defaults to 80. */
  height?: number
  /**
   * The node's accessible name, already translated. Names the node's
   * keyboard select button; without it a node whose renderer and children
   * render nothing is announced as the canvas's own numbered node label.
   */
  ariaLabel?: string
}

/**
 * Edge connecting two nodes.
 *
 * `sourceHandle` / `targetHandle` are optional handle ids — when omitted
 * the edge connects the right edge of the source to the left edge of the
 * target (the default port positions for a left-to-right DAG).
 */
export interface FlowEdge {
  /** Unique edge id. */
  id: string
  /** Source node id. */
  source: string
  /** Optional source-side handle id. */
  sourceHandle?: string
  /** Target node id. */
  target: string
  /** Optional target-side handle id. */
  targetHandle?: string
}

/** Renderer for a single node `type`: the node in, JSX out. */
export type FlowNodeRenderer<T = unknown> = (node: FlowNode<T>) => JSX.Element

/** Map of node `type` → renderer. */
export type FlowNodeRenderers = Record<string, FlowNodeRenderer>

/**
 * Selection state held internally by `<FlowCanvas>` and surfaced through
 * the `onSelectionChange` callback.
 */
export interface FlowSelection {
  /** Selected node ids. */
  nodeIds: string[]
  /** Selected edge ids. */
  edgeIds: string[]
}

/**
 * Change payload emitted by `<FlowCanvas>` when the graph is mutated by
 * a built-in interaction (drag, connect, delete).
 */
export interface FlowChange {
  /** Updated node array (always the full new array). */
  nodes: FlowNode[]
  /** Updated edge array (always the full new array). */
  edges: FlowEdge[]
}

/** Viewport (pan + zoom) state. */
export interface FlowViewport {
  /** Horizontal pan offset, in screen pixels. */
  x: number
  /** Vertical pan offset, in screen pixels. */
  y: number
  /** Zoom factor; 1 = 100%. */
  zoom: number
}

/** `<FlowCanvas>` props (React names). */
export interface FlowCanvasProps {
  /** Nodes (controlled) or initial nodes (uncontrolled). */
  nodes: FlowNode[]
  /** Edges (controlled) or initial edges (uncontrolled). */
  edges: FlowEdge[]
  /**
   * If provided, the canvas runs in **controlled** mode: built-in
   * interactions (drag, connect, delete) call `onChange` instead of
   * mutating internal state.
   */
  onChange?: (next: FlowChange) => void
  /**
   * Map of node `type` → renderer. The output fills the node and names its
   * keyboard select button (a sibling beneath it), so it may hold its own
   * controls.
   */
  nodeRenderers?: FlowNodeRenderers
  /**
   * Fallback content rendered inside every node when `nodeRenderers` has no
   * match.
   */
  children?: JSX.Element
  /** Fired when the selection changes. */
  onSelectionChange?: (selection: FlowSelection) => void
  /** Fired when an edge is clicked. */
  onEdgeClick?: (edge: FlowEdge) => void
  /** Fired when a node is clicked. */
  onNodeClick?: (node: FlowNode) => void
  /** Disables the built-in delete-key shortcut. */
  disableDeleteShortcut?: boolean
  /** Disables panning of the canvas. */
  disablePan?: boolean
  /** Disables zooming via mouse wheel. */
  disableZoom?: boolean
  /** Show the dotted background grid. Defaults to true. */
  showGrid?: boolean
  /** Initial viewport (uncontrolled only). */
  initialViewport?: FlowViewport
  /** Extra classes merged onto the outer wrapper. */
  className?: string
}
