/**
 * Vue flow / DAG canvas primitives — the Vue counterpart of
 * `@molecule/app-flow-canvas-react`, with the same props (React names), the
 * same ClassMap classes, and the same DOM for the same input.
 *
 * Exports:
 * - `<FlowCanvas>` — top-level node-and-edge editor with drag, connect,
 *   pan, zoom, select, and delete behaviors built in.
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
 * ```ts
 * import { createApp, defineComponent, h, ref } from 'vue'
 * import { FlowCanvas, type FlowEdge, type FlowNode } from '@molecule/app-flow-canvas-vue'
 *
 * const Builder = defineComponent({
 *   setup() {
 *     const nodes = ref<FlowNode[]>([
 *       { id: 'a', type: 'task', position: { x: 40, y: 40 }, data: { label: 'Start' } },
 *     ])
 *     const edges = ref<FlowEdge[]>([])
 *     return () =>
 *       h(FlowCanvas, {
 *         nodes: nodes.value,
 *         edges: edges.value,
 *         onChange: ({ nodes: n, edges: e }) => {
 *           nodes.value = n
 *           edges.value = e
 *         },
 *         nodeRenderers: {
 *           task: (node) => h('strong', String((node.data as { label: string }).label)),
 *         },
 *       })
 *   },
 * })
 *
 * createApp(Builder).mount('#app')
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
 * Fallback content for nodes without a renderer is the DEFAULT slot (or the
 * `children` prop); every node renders its own copy of it.
 *
 * @module
 */

export * from './FlowCanvas.js'
export * from './geometry.js'
export * from './types.js'
