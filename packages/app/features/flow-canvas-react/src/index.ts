/**
 * React flow / DAG canvas primitives.
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
 * ```tsx
 * import { FlowCanvas, type FlowNode, type FlowEdge } from '@molecule/app-flow-canvas-react'
 *
 * function Builder() {
 *   const [nodes, setNodes] = useState<FlowNode[]>(initialNodes)
 *   const [edges, setEdges] = useState<FlowEdge[]>(initialEdges)
 *   return (
 *     <FlowCanvas
 *       nodes={nodes}
 *       edges={edges}
 *       onChange={({ nodes, edges }) => { setNodes(nodes); setEdges(edges) }}
 *       nodeRenderers={{
 *         task: (n) => <strong>{(n.data as { label: string }).label}</strong>,
 *       }}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * The canvas fills 100% of its parent — give the PARENT an explicit
 * height (fixed-height panel, flex/grid track) or the canvas renders
 * zero-tall and appears blank.
 *
 * Passing `onChange` puts the canvas in controlled mode: built-in edits
 * (node drag, connect, Backspace/Delete) call `onChange` with the full
 * next `{ nodes, edges }` and the caller re-renders with them. Without
 * `onChange` the canvas manages internal copies and `nodes` / `edges`
 * act as initial values only.
 *
 * @module
 */

export * from './FlowCanvas.js'
export * from './geometry.js'
export * from './types.js'
