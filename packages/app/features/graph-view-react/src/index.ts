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
 * the same way Obsidian does — a force-directed map of which notes link
 * to which.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { type GraphEdge, type GraphNode, GraphView } from '@molecule/app-feature-graph-view-react'
 *
 * export function NoteGraph() {
 *   const notes = [
 *     { id: 'inbox', title: 'Inbox', linkCount: 2 },
 *     { id: 'ideas', title: 'Ideas', linkCount: 1 },
 *     { id: 'reading', title: 'Reading list', linkCount: 1 },
 *   ]
 *   const links = [
 *     { id: 'l1', from: 'inbox', to: 'ideas' },
 *     { id: 'l2', from: 'inbox', to: 'reading' },
 *   ]
 *   const [selectedId, setSelectedId] = useState<string>()
 *   const nodes: GraphNode[] = notes.map((n) => ({ id: n.id, label: n.title, weight: n.linkCount }))
 *   const edges: GraphEdge[] = links.map((l) => ({ id: l.id, source: l.from, target: l.to }))
 *   return (
 *     <div style={{ height: 480 }}>
 *       <GraphView
 *         nodes={nodes}
 *         edges={edges}
 *         selectedNodeId={selectedId}
 *         onNodeClick={(node) => setSelectedId(node.id)}
 *       />
 *     </div>
 *   )
 * }
 * ```
 *
 * @remarks
 * It calls `useTranslation()` from `@molecule/app-react`, so it MUST render
 * inside `<I18nProvider>` / `<MoleculeProvider>` (it throws otherwise), and
 * `getClassMap()` throws unless `setClassMap(classMap)` from `@molecule/app-ui`
 * ran at startup.
 *
 * It does NOT track selection itself: `selectedNodeId` is controlled — keep it
 * in your own state and update it from `onNodeClick`. Edges whose `source` /
 * `target` id is not in `nodes` are silently skipped.
 *
 * The root element fills 100% of its parent — the PARENT must have an
 * explicit height (e.g. a fixed-height panel or a flex/grid track) or
 * the graph renders zero-tall and appears blank.
 *
 * Interaction surface is click / keyboard-activate + `selectedNodeId`
 * highlighting only. Nodes are NOT draggable and there is no built-in
 * pan / zoom — the SVG `viewBox` auto-fits the layout bounds. For a
 * pannable / zoomable surface, compose with
 * `@molecule/app-feature-canvas-react` instead.
 *
 * Layout is deterministic (seeded RNG), computed once per
 * `(nodes, edges, layout, forceOptions)` change. `forceOptions` is
 * ignored by the `circular` and `grid` layouts.
 *
 * @module
 */

export * from './GraphView.js'
export * from './layout.js'
export * from './types.js'
