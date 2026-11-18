/**
 * Svelte flow / DAG canvas primitives — the Svelte counterpart of
 * `@molecule/app-flow-canvas-react`, with the same props (React names), the
 * same ClassMap classes, and the same DOM for the same input.
 *
 * Exports:
 * - `FlowCanvas` — top-level node-and-edge editor with drag, connect, pan,
 *   zoom, select, and delete behaviors built in.
 * - `FlowNode`, `FlowEdge`, `FlowPoint`, `FlowChange`, `FlowSelection`,
 *   `FlowViewport`, `FlowNodeRenderer`, `FlowNodeRenderers` types.
 * - Pure geometry helpers (`bezierPath`, `defaultSourcePort`,
 *   `defaultTargetPort`, `addEdge`, `removeEdge`, `removeNode`,
 *   `moveNode`, `translateNode`, `clientToWorld`).
 *
 * Used by ai-chatbot-builder, ai-workflow-automator, and
 * ai-agent-playground for visual graph composition.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { FlowCanvas } from '@molecule/app-flow-canvas-svelte'
 *   import type { FlowEdge, FlowNode } from '@molecule/app-flow-canvas-svelte'
 *
 *   let nodes = $state<FlowNode[]>([
 *     { id: 'a', type: 'task', position: { x: 40, y: 40 }, data: { label: 'Start' } },
 *   ])
 *   let edges = $state<FlowEdge[]>([])
 * </script>
 *
 * {#snippet taskNode(node: FlowNode)}
 *   <strong>{(node.data as { label: string }).label}</strong>
 * {/snippet}
 *
 * <FlowCanvas
 *   {nodes}
 *   {edges}
 *   onChange={({ nodes: nextNodes, edges: nextEdges }) => {
 *     nodes = nextNodes
 *     edges = nextEdges
 *   }}
 *   nodeRenderers={{ task: taskNode }}
 * />
 * ```
 *
 * @remarks
 * The canvas fills 100% of its parent — give the PARENT an explicit height
 * (fixed-height panel, flex/grid track) or the canvas renders zero-tall and
 * appears blank.
 *
 * Passing `onChange` puts the canvas in controlled mode: built-in edits (node
 * drag, connect, Backspace/Delete) call `onChange` with the full next
 * `{ nodes, edges }` and the caller re-renders with them. Without `onChange`
 * the canvas manages internal copies and `nodes` / `edges` act as initial
 * values only.
 *
 * Node renderers and the children fallback are snippets: pass
 * `nodeRenderers={{ task: nodeSnippet }}` with a `Snippet<[FlowNode]>`, and
 * fill `children` from the component's default content.
 *
 * @module
 */

export * from './components.js'
export * from './geometry.js'
export * from './types.js'
