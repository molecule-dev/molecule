/**
 * React force-directed graph view (Obsidian-style).
 *
 * Exports:
 * - `<GraphView>` — top-level node-and-edge visualization with built-in
 *   `force`, `circular`, and `grid` layouts, click + selection support,
 *   and pluggable node / edge renderers.
 * - `GraphNode`, `GraphEdge`, `GraphLayout`, `GraphPoint`, `PositionedNode`,
 *   `GraphNodeRenderer`, `GraphEdgeRenderer` types.
 * - Pure layout helpers (`forceLayout`, `circularLayout`, `gridLayout`,
 *   `layoutNodes`, `boundingBox`, `createRng`).
 *
 * Used by note-taking and other apps to visualize page / note linkages
 * the same way Obsidian does — a draggable, force-directed map of which
 * notes link to which.
 *
 * @example
 * ```tsx
 * import { GraphView, type GraphNode, type GraphEdge } from '@molecule/app-feature-graph-view-react'
 *
 * function NoteGraph({ notes, links }: { notes: Note[]; links: Link[] }) {
 *   const nodes: GraphNode[] = notes.map((n) => ({ id: n.id, label: n.title, weight: n.linkCount }))
 *   const edges: GraphEdge[] = links.map((l) => ({ id: l.id, source: l.from, target: l.to }))
 *   return <GraphView nodes={nodes} edges={edges} onNodeClick={(n) => open(n.id)} />
 * }
 * ```
 *
 * @module
 */

export * from './GraphView.js'
export * from './layout.js'
export * from './types.js'
