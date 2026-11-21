/**
 * Vue force-directed graph view (Obsidian-style) — the Vue counterpart of
 * `@molecule/app-feature-graph-view-react`: the same exports, the same props
 * (React names), and the same DOM for the same input.
 *
 * Exports:
 * - `<GraphView>` — top-level node-and-edge visualization with built-in
 *   `force`, `circular`, and `grid` layouts, click + selection support,
 *   and pluggable node / edge renderers.
 * - `GraphNode`, `GraphEdge`, `GraphLayout`, `GraphPoint`, `PositionedNode`,
 *   `GraphNodeRenderer`, `GraphEdgeRenderer`, `GraphViewProps` types.
 * - Pure layout helpers (`forceLayout`, `circularLayout`, `gridLayout`,
 *   `layoutNodes`, `boundingBox`, `createRng`).
 *
 * Used by note-taking and other apps to visualize page / note linkages
 * the same way Obsidian does — a force-directed map of which notes link
 * to which.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { GraphView, type GraphEdge, type GraphNode } from '@molecule/app-feature-graph-view-vue'
 *
 * const nodes: GraphNode[] = [
 *   { id: 'a', label: 'Alpha' },
 *   { id: 'b', label: 'Beta', group: 'project', weight: 2 },
 * ]
 * const edges: GraphEdge[] = [{ id: 'e1', source: 'a', target: 'b' }]
 *
 * const NoteGraph = defineComponent({
 *   setup() {
 *     return () =>
 *       h(GraphView, {
 *         nodes,
 *         edges,
 *         onNodeClick: (node: GraphNode) => console.log(`open ${node.id}`),
 *       })
 *   },
 * })
 *
 * createApp(NoteGraph).mount('#app')
 * ```
 *
 * @remarks
 * The root element fills 100% of its parent — the PARENT must have an
 * explicit height (e.g. a fixed-height panel or a flex/grid track) or
 * the graph renders zero-tall and appears blank.
 *
 * Interaction surface is click / keyboard-activate + `selectedNodeId`
 * highlighting only. Nodes are NOT draggable and there is no built-in
 * pan / zoom — the SVG `viewBox` auto-fits the layout bounds. For a
 * pannable / zoomable surface, compose with
 * `@molecule/app-feature-canvas-vue` instead.
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
