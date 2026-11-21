import type { TemplateRef } from '@angular/core'

import type { ForceLayoutOptions } from './layout.js'

/**
 * Graph-view types: nodes, edges, layout choice and renderer templates for
 * `<GraphView>` — the Angular counterpart of
 * `@molecule/app-feature-graph-view-react`'s types, with the same names.
 *
 * @module
 */

/** A 2-D point in graph (world) coordinates. */
export interface GraphPoint {
  /** X coordinate. */
  x: number
  /** Y coordinate. */
  y: number
}

/**
 * Single node in the graph.
 *
 * `group` is an opaque grouping discriminator (e.g. tag, folder) the
 * caller can use for colouring; `weight` scales the rendered radius.
 */
export interface GraphNode {
  /** Unique node id. */
  id: string
  /** Human-readable label rendered next to the node. */
  label: string
  /** Optional grouping discriminator (e.g. tag id). */
  group?: string
  /** Optional weight; default 1. Scales the rendered radius. */
  weight?: number
}

/** Edge connecting two nodes by id. */
export interface GraphEdge {
  /** Unique edge id. */
  id: string
  /** Source node id. */
  source: string
  /** Target node id. */
  target: string
  /** Optional weight; default 1. Stronger edges pull harder under force layout. */
  weight?: number
}

/** Available layout strategies. */
export type GraphLayout = 'force' | 'circular' | 'grid'

/**
 * Internal positioned node used by the renderer; the `x`/`y` coordinates
 * are in world (graph) space, with `(0, 0)` at the canvas centre.
 */
export interface PositionedNode extends GraphNode {
  /** World-space X coordinate. */
  x: number
  /** World-space Y coordinate. */
  y: number
}

/**
 * Renderer for an individual node: an Angular template rendered through
 * `ngTemplateOutlet`, with the positioned node as `a0` (`$implicit` is not
 * used, so the template reads `let-node="a0"`).
 */
export type GraphNodeRenderer = TemplateRef<{ a0: PositionedNode }>

/**
 * Renderer for an individual edge: a template rendered with the edge as `a0`,
 * the source node as `a1` and the target node as `a2`.
 */
export type GraphEdgeRenderer = TemplateRef<{
  a0: GraphEdge
  a1: PositionedNode
  a2: PositionedNode
}>

/**
 * Props accepted by {@link GraphView} — the same props
 * `@molecule/app-feature-graph-view-react` accepts. The renderer props are
 * Angular templates (a node cannot carry a function), so they are written in
 * the host template, not bound as values.
 */
export interface GraphViewProps {
  /** Nodes to render. */
  nodes: GraphNode[]
  /** Edges to render. */
  edges: GraphEdge[]
  /** Fired when the user clicks (or activates) a node. */
  onNodeClick?: (node: GraphNode) => void
  /** Currently-selected node id (highlighted in the view). */
  selectedNodeId?: string
  /** Layout strategy. Defaults to `'force'`. */
  layout?: GraphLayout
  /** Custom node renderer (overrides the default circle + label). */
  nodeRenderer?: GraphNodeRenderer
  /** Custom edge renderer (overrides the default `<line>`). */
  edgeRenderer?: GraphEdgeRenderer
  /** Force-layout tunables; ignored for non-force layouts. */
  forceOptions?: ForceLayoutOptions
  /** Extra classes merged onto the outer wrapper. */
  className?: string
}
