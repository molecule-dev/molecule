# @molecule/app-flow-canvas-react

React flow / DAG canvas primitives.

Exports:
- `<FlowCanvas>` — top-level node-and-edge editor with drag, connect,
  pan, zoom, select, and delete behaviors built in.
- `FlowNode`, `FlowEdge`, `FlowPoint`, `FlowChange`, `FlowSelection`,
  `FlowViewport`, `FlowNodeRenderer`, `FlowNodeRenderers` types.
- Pure geometry helpers (`bezierPath`, `defaultSourcePort`,
  `defaultTargetPort`, `addEdge`, `removeEdge`, `removeNode`,
  `moveNode`, `translateNode`, `clientToWorld`).

Used by ai-chatbot-builder, ai-workflow-automator, and
ai-agent-playground for visual graph composition.

## Quick Start

```tsx
import { FlowCanvas, type FlowNode, type FlowEdge } from '@molecule/app-flow-canvas-react'

function Builder() {
  const [nodes, setNodes] = useState<FlowNode[]>(initialNodes)
  const [edges, setEdges] = useState<FlowEdge[]>(initialEdges)
  return (
    <FlowCanvas
      nodes={nodes}
      edges={edges}
      onChange={({ nodes, edges }) => { setNodes(nodes); setEdges(edges) }}
      nodeRenderers={{
        task: (n) => <strong>{(n.data as { label: string }).label}</strong>,
      }}
    />
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-flow-canvas-react @molecule/app-react @molecule/app-ui react
npm install -D @types/react
```

## API

### Interfaces

#### `FlowCanvasProps`

`<FlowCanvas>` props.

```typescript
interface FlowCanvasProps {
  /** Nodes (controlled) or initial nodes (uncontrolled). */
  nodes: FlowNode[]
  /** Edges (controlled) or initial edges (uncontrolled). */
  edges: FlowEdge[]
  /**
   * If provided, the canvas runs in **controlled** mode: built-in
   * interactions (drag, connect, delete) call `onChange` instead of
   * mutating internal state.
   */
  onChange?: (next: FlowChange) => void
  /** Map of node `type` → renderer. */
  nodeRenderers?: FlowNodeRenderers
  /** Fallback children rendered inside every node when `nodeRenderers` has no match. */
  children?: ReactNode
  /** Fired when the selection changes. */
  onSelectionChange?: (selection: FlowSelection) => void
  /** Fired when an edge is clicked. */
  onEdgeClick?: (edge: FlowEdge) => void
  /** Fired when a node is clicked. */
  onNodeClick?: (node: FlowNode) => void
  /** Disables the built-in delete-key shortcut. */
  disableDeleteShortcut?: boolean
  /** Disables panning of the canvas. */
  disablePan?: boolean
  /** Disables zooming via mouse wheel. */
  disableZoom?: boolean
  /** Show the dotted background grid. Defaults to true. */
  showGrid?: boolean
  /** Initial viewport (uncontrolled only). */
  initialViewport?: FlowViewport
  /** Extra classes merged onto the outer wrapper. */
  className?: string
}
```

#### `FlowChange`

Change payload emitted by `<FlowCanvas>` when the graph is mutated by
a built-in interaction (drag, connect, delete).

```typescript
interface FlowChange {
  /** Updated node array (always the full new array). */
  nodes: FlowNode[]
  /** Updated edge array (always the full new array). */
  edges: FlowEdge[]
}
```

#### `FlowEdge`

Edge connecting two nodes.

`sourceHandle` / `targetHandle` are optional handle ids — when omitted
the edge connects the right edge of the source to the left edge of the
target (the default port positions for a left-to-right DAG).

```typescript
interface FlowEdge {
  /** Unique edge id. */
  id: string
  /** Source node id. */
  source: string
  /** Optional source-side handle id. */
  sourceHandle?: string
  /** Target node id. */
  target: string
  /** Optional target-side handle id. */
  targetHandle?: string
}
```

#### `FlowNode`

Single node on the canvas.

`data` is opaque to the canvas — it's passed back to the renderer the
consumer registers for the matching `type`.

```typescript
interface FlowNode<T = unknown> {
  /** Unique node id. */
  id: string
  /** Discriminator the consumer uses to pick a renderer. */
  type: string
  /** World-space top-left of the node. */
  position: FlowPoint
  /** Free-form payload echoed back to the renderer. */
  data?: T
  /** Optional explicit width (in world units). Defaults to 180. */
  width?: number
  /** Optional explicit height (in world units). Defaults to 80. */
  height?: number
}
```

#### `FlowPoint`

A 2-D point in canvas (world) coordinates.

```typescript
interface FlowPoint {
  /** X coordinate. */
  x: number
  /** Y coordinate. */
  y: number
}
```

#### `FlowSelection`

Selection state held internally by `<FlowCanvas>` and surfaced through
the `onSelectionChange` callback.

```typescript
interface FlowSelection {
  /** Selected node ids. */
  nodeIds: string[]
  /** Selected edge ids. */
  edgeIds: string[]
}
```

#### `FlowViewport`

Viewport (pan + zoom) state.

```typescript
interface FlowViewport {
  /** Horizontal pan offset, in screen pixels. */
  x: number
  /** Vertical pan offset, in screen pixels. */
  y: number
  /** Zoom factor; 1 = 100%. */
  zoom: number
}
```

### Types

#### `FlowNodeRenderer`

Renderer for a single node `type`.

```typescript
type FlowNodeRenderer<T = unknown> = (node: FlowNode<T>) => ReactNode
```

#### `FlowNodeRenderers`

Map of node `type` → renderer.

```typescript
type FlowNodeRenderers = Record<string, FlowNodeRenderer>
```

### Functions

#### `addEdge(edges, edge)`

Append a new edge — guarding against self-loops and exact duplicates.

```typescript
function addEdge(edges: FlowEdge[], edge: FlowEdge): FlowEdge[]
```

- `edges` — Current edge list.
- `edge` — Candidate edge.

**Returns:** New edge array; returns `edges` unchanged if the edge would
 *   self-loop or duplicate an existing source/target/handle pair.

#### `bezierPath(a, b)`

Build a smooth horizontal cubic-Bezier SVG path between two world
points, with handles tugged horizontally for a "flow chart" feel.

```typescript
function bezierPath(a: FlowPoint, b: FlowPoint): string
```

- `a` — Start point (source).
- `b` — End point (target).

**Returns:** SVG `d` attribute string.

#### `clientToWorld(clientX, clientY, rect, viewport)`

Convert a screen-space pointer event coordinate into world-space
(canvas-local) coordinates given the current viewport pan + zoom and
the canvas element's bounding rect.

```typescript
function clientToWorld(clientX: number, clientY: number, rect: { left: number; top: number; }, viewport: { x: number; y: number; zoom: number; }): FlowPoint
```

- `clientX` — Pointer event clientX.
- `clientY` — Pointer event clientY.
- `rect` — The canvas root's `getBoundingClientRect()`.
- `viewport` — Current pan + zoom.

**Returns:** World-space point.

#### `defaultSourcePort(node)`

World-space coordinates of a node's default source port (right edge,
vertically centred). Used when `edge.sourceHandle` is unset.

```typescript
function defaultSourcePort(node: FlowNode<unknown>): FlowPoint
```

- `node` — The source node.

**Returns:** Centre-right anchor point in world coordinates.

#### `defaultTargetPort(node)`

World-space coordinates of a node's default target port (left edge,
vertically centred). Used when `edge.targetHandle` is unset.

```typescript
function defaultTargetPort(node: FlowNode<unknown>): FlowPoint
```

- `node` — The target node.

**Returns:** Centre-left anchor point in world coordinates.

#### `FlowCanvas(props)`

Visual flow / DAG editor.

Renders nodes as absolutely-positioned `<div>` slots and edges as a
single `<svg>` overlay containing one `<path>` per edge. Built-in
interactions:

- **Drag a node** — press on a node body and drag to reposition.
- **Pan the canvas** — press on empty space and drag.
- **Zoom** — mouse-wheel scroll (anchored on the cursor).
- **Connect ports** — press on a source handle (right edge of a node)
  and drag onto another node to create an edge.
- **Select** — click a node or edge; Backspace / Delete removes
  everything in the selection.

Style is driven entirely by `getClassMap()`. Inline styles are reserved
for geometry — node `transform: translate(...)`, viewport pan/zoom,
SVG attributes — which classes can't express.

```typescript
function FlowCanvas(props: FlowCanvasProps): JSX.Element
```

- `props` — Component props.

**Returns:** The flow canvas element.

#### `moveNode(nodes, id, position)`

Move a single node to a new absolute position (immutably).

```typescript
function moveNode(nodes: FlowNode<unknown>[], id: string, position: FlowPoint): FlowNode<unknown>[]
```

- `nodes` — Current node list.
- `id` — Node id to move.
- `position` — New world-space top-left.

**Returns:** New node array (same length, with the matching node updated).

#### `removeEdge(edges, id)`

Remove a single edge by id (immutably).

```typescript
function removeEdge(edges: FlowEdge[], id: string): FlowEdge[]
```

- `edges` — Current edge list.
- `id` — Edge id to drop.

**Returns:** Filtered edge array.

#### `removeNode(nodes, edges, id)`

Remove a node and any edges connected to it.

```typescript
function removeNode(nodes: FlowNode<unknown>[], edges: FlowEdge[], id: string): { nodes: FlowNode[]; edges: FlowEdge[]; }
```

- `nodes` — Current node list.
- `edges` — Current edge list.
- `id` — Node id to remove.

**Returns:** Pruned `{ nodes, edges }`.

#### `translateNode(nodes, id, dx, dy)`

Apply a delta (in world units) to a node's position.

```typescript
function translateNode(nodes: FlowNode<unknown>[], id: string, dx: number, dy: number): FlowNode<unknown>[]
```

- `nodes` — Current node list.
- `id` — Node id to translate.
- `dx` — Horizontal delta.
- `dy` — Vertical delta.

**Returns:** New node array.

### Constants

#### `DEFAULT_NODE_HEIGHT`

Default node height when `node.height` is unset.

```typescript
const DEFAULT_NODE_HEIGHT: 80
```

#### `DEFAULT_NODE_WIDTH`

Default node width when `node.width` is unset.

```typescript
const DEFAULT_NODE_WIDTH: 180
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `react`

## Translations

Translation strings are provided by `@molecule/app-locales-flow-canvas`.
