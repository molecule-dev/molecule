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
 * import { useState } from 'react'
 *
 * import { FlowCanvas, type FlowEdge, type FlowNode } from '@molecule/app-flow-canvas-react'
 *
 * export function WorkflowBuilder() {
 *   const [nodes, setNodes] = useState<FlowNode[]>([
 *     { id: 'signup', type: 'step', position: { x: 40, y: 40 }, data: { label: 'New signup' } },
 *     { id: 'email', type: 'step', position: { x: 320, y: 40 }, data: { label: 'Send welcome email' } },
 *     { id: 'slack', type: 'step', position: { x: 600, y: 40 }, data: { label: 'Notify #sales' } },
 *   ])
 *   const [edges, setEdges] = useState<FlowEdge[]>([{ id: 'e1', source: 'signup', target: 'email' }])
 *   return (
 *     <div style={{ height: 480 }}>
 *       <FlowCanvas
 *         nodes={nodes}
 *         edges={edges}
 *         onChange={(next) => {
 *           setNodes(next.nodes)
 *           setEdges(next.edges)
 *         }}
 *         nodeRenderers={{ step: (n) => <strong>{(n.data as { label: string }).label}</strong> }}
 *       />
 *     </div>
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
 * act as initial values only. With `onChange` but WITHOUT feeding
 * `next.nodes` / `next.edges` back in, drags and connections snap back.
 *
 * `nodeRenderers` is keyed by `node.type` — a node whose `type` has no
 * renderer shows `children` (or nothing). `data` is untyped (`unknown`):
 * cast it in the renderer. It does not persist, validate (e.g. cycles), or
 * auto-layout the graph; new edges get generated ids. Backspace/Delete is a
 * WINDOW-level listener that removes the current selection (ignored while
 * typing in inputs) — pass `disableDeleteShortcut` if that clashes.
 *
 * It calls `useTranslation()`, so it must render inside `<I18nProvider>` /
 * `<MoleculeProvider>`; `getClassMap()` throws unless
 * `setClassMap(classMap)` from `@molecule/app-ui` ran at startup.
 *
 * @module
 */

export * from './FlowCanvas.js'
export * from './geometry.js'
export * from './types.js'
