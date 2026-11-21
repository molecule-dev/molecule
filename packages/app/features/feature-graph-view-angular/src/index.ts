/**
 * Angular force-directed graph view (Obsidian-style) — the counterpart of
 * `@molecule/app-feature-graph-view-react`: the same exports, the same props
 * (React names), and the same DOM for the same input.
 *
 * Exports:
 * - `<GraphView>` (`div[mol-graph-view]`) — top-level node-and-edge
 *   visualization with built-in `force`, `circular`, and `grid` layouts,
 *   click + selection support, and pluggable node / edge templates.
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
 * import { Component } from '@angular/core'
 * import { GraphView, type GraphEdge, type GraphNode } from '@molecule/app-feature-graph-view-angular'
 *
 * const noteNodes: GraphNode[] = [
 *   { id: 'a', label: 'Alpha' },
 *   { id: 'b', label: 'Beta', group: 'project', weight: 2 },
 * ]
 * const linkEdges: GraphEdge[] = [{ id: 'e1', source: 'a', target: 'b' }]
 *
 * @Component({
 *   selector: 'app-note-graph',
 *   standalone: true,
 *   imports: [GraphView],
 *   template: `<div mol-graph-view [nodes]="nodes" [edges]="edges" [onNodeClick]="open"></div>`,
 * })
 * export class NoteGraph {
 *   nodes = noteNodes
 *   edges = linkEdges
 *   open(node: GraphNode): void {
 *     console.log(`open ${node.id}`)
 *   }
 * }
 * ```
 *
 * @remarks
 * The root element fills 100% of its parent — the PARENT must have an
 * explicit height (e.g. a fixed-height panel or a flex/grid track) or
 * the graph renders zero-tall and appears blank.
 *
 * Interaction surface is click / keyboard-activate + `selectedNodeId`
 * highlighting only. Nodes are NOT draggable and there is no built-in
 * pan / zoom — the SVG `viewBox` auto-fits the layout bounds.
 *
 * The renderer props are Angular templates, rendered with `ngTemplateOutlet`:
 * `nodeRenderer` receives the positioned node as `a0`; `edgeRenderer` receives
 * the edge as `a0`, the source node as `a1` and the target node as `a2`.
 *
 * Layout is deterministic (seeded RNG), computed once per
 * `(nodes, edges, layout, forceOptions)` change. `forceOptions` is
 * ignored by the `circular` and `grid` layouts.
 *
 * @module
 */

export * from './graph-view.component.js'
export * from './layout.js'
export * from './types.js'
