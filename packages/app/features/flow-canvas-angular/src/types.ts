/**
 * Types of `@molecule/app-flow-canvas-angular` — the Angular counterpart of
 * `@molecule/app-flow-canvas-react`, with the same field names.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

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

/** Renderer for a single node `type`: a template whose context is the node. */
export type FlowNodeRenderer<T = unknown> = TemplateRef<{
  /** The node (React's first renderer argument). */
  $implicit: FlowNode<T>
  /** The node, Angular's `let-a0` binding. */
  a0: FlowNode<T>
  /** React's second renderer argument (unused by this renderer). */
  a1?: unknown
  /** React's third renderer argument (unused by this renderer). */
  a2?: unknown
}>

/** Map of node `type` → renderer template. */
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

/**
 * Props accepted by {@link FlowCanvas} — the same props
 * `@molecule/app-flow-canvas-react` accepts. Node props (`nodeRenderers`,
 * `children`) are templates/projected content in Angular (an input cannot
 * carry a node), so they are typed accordingly: `children` is the element's
 * default projected content.
 */
export interface FlowCanvasProps {
  /** Nodes (controlled) or initial nodes (uncontrolled). */
  nodes: FlowNode[]
  /** Edges (controlled) or initial edges (uncontrolled). */
  edges: FlowEdge[]
  /** If provided, the canvas runs in controlled mode. */
  onChange?: (next: FlowChange) => void
  /** Map of node `type` → renderer template. */
  nodeRenderers?: FlowNodeRenderers
  /** Main fallback content — projected as the element's default content. */
  children?: unknown
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
