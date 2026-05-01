import type { ReactNode } from 'react'

/**
 * Graph-view types: nodes, edges, layout choice and renderer hooks for
 * `<GraphView>`.
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

/** Renderer for an individual node. Receives the positioned node. */
export type GraphNodeRenderer = (node: PositionedNode) => ReactNode

/** Renderer for an individual edge. Receives the edge plus both endpoints. */
export type GraphEdgeRenderer = (
  edge: GraphEdge,
  source: PositionedNode,
  target: PositionedNode,
) => ReactNode
