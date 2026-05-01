import type { ReactNode } from 'react'

/**
 * Flow-canvas types: nodes, edges, and the controlled / uncontrolled
 * change events emitted by `<FlowCanvas>`.
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

/** Renderer for a single node `type`. */
export type FlowNodeRenderer<T = unknown> = (node: FlowNode<T>) => ReactNode

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
