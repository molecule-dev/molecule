/**
 * Angular flow / DAG canvas primitives — the Angular counterpart of
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
 * ```ts
 * import { Component } from '@angular/core'
 * import { FlowCanvas, type FlowEdge, type FlowNode } from '@molecule/app-flow-canvas-angular'
 *
 * @Component({
 *   selector: 'app-builder',
 *   standalone: true,
 *   imports: [FlowCanvas],
 *   template: `
 *     <div mol-flow-canvas [nodes]="nodes" [edges]="edges" [onChange]="save">
 *       <ng-template #taskNode let-node>Task {{ node.data.label }}</ng-template>
 *     </div>
 *   `,
 * })
 * export class Builder {
 *   nodes: FlowNode[] = [
 *     { id: 'a', type: 'task', position: { x: 40, y: 40 }, data: { label: 'Start' } },
 *   ]
 *   edges: FlowEdge[] = []
 *   readonly save = ({ nodes, edges }: { nodes: FlowNode[]; edges: FlowEdge[] }): void => {
 *     this.nodes = nodes
 *     this.edges = edges
 *   }
 * }
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
 * Node props are Angular values: `nodeRenderers` maps a node type to an
 * `<ng-template>` whose context is the node (`let-node`), and fallback
 * content is the element's projected content — each node without a renderer
 * renders its own copy of it.
 *
 * @module
 */

export * from './flow-canvas.component.js'
export * from './geometry.js'
export * from './types.js'
