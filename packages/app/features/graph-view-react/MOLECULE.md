# @molecule/app-feature-graph-view-react

React force-directed graph view (Obsidian-style).

Exports:
- `<GraphView>` — top-level node-and-edge visualization with built-in
  `force`, `circular`, and `grid` layouts, click + selection support,
  and pluggable node / edge renderers.
- `GraphNode`, `GraphEdge`, `GraphLayout`, `GraphPoint`, `PositionedNode`,
  `GraphNodeRenderer`, `GraphEdgeRenderer` types.
- Pure layout helpers (`forceLayout`, `circularLayout`, `gridLayout`,
  `layoutNodes`, `boundingBox`, `createRng`).

Used by note-taking and other apps to visualize page / note linkages
the same way Obsidian does — a draggable, force-directed map of which
notes link to which.

## Quick Start

```tsx
import { GraphView, type GraphNode, type GraphEdge } from '@molecule/app-feature-graph-view-react'

function NoteGraph({ notes, links }: { notes: Note[]; links: Link[] }) {
  const nodes: GraphNode[] = notes.map((n) => ({ id: n.id, label: n.title, weight: n.linkCount }))
  const edges: GraphEdge[] = links.map((l) => ({ id: l.id, source: l.from, target: l.to }))
  return <GraphView nodes={nodes} edges={edges} onNodeClick={(n) => open(n.id)} />
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-feature-graph-view-react @molecule/app-react @molecule/app-ui react
npm install -D @types/react
```

## API

### Interfaces

#### `ForceLayoutOptions`

Force-layout tunables.

```typescript
interface ForceLayoutOptions {
  /** Hard cap on iterations. Defaults to {@link DEFAULT_FORCE_ITERATIONS}. */
  iterations?: number
  /** Repulsive constant between every pair of nodes. */
  repulsion?: number
  /** Spring (Hooke) constant for edges. */
  spring?: number
  /** Ideal edge length (rest distance). */
  restLength?: number
  /** Velocity damping per step (0–1). */
  damping?: number
  /** Optional deterministic seed (for tests). Defaults to a fixed value. */
  seed?: number
}
```

#### `GraphEdge`

Edge connecting two nodes by id.

```typescript
interface GraphEdge {
  /** Unique edge id. */
  id: string
  /** Source node id. */
  source: string
  /** Target node id. */
  target: string
  /** Optional weight; default 1. Stronger edges pull harder under force layout. */
  weight?: number
}
```

#### `GraphNode`

Single node in the graph.

`group` is an opaque grouping discriminator (e.g. tag, folder) the
caller can use for colouring; `weight` scales the rendered radius.

```typescript
interface GraphNode {
  /** Unique node id. */
  id: string
  /** Human-readable label rendered next to the node. */
  label: string
  /** Optional grouping discriminator (e.g. tag id). */
  group?: string
  /** Optional weight; default 1. Scales the rendered radius. */
  weight?: number
}
```

#### `GraphPoint`

A 2-D point in graph (world) coordinates.

```typescript
interface GraphPoint {
  /** X coordinate. */
  x: number
  /** Y coordinate. */
  y: number
}
```

#### `GraphViewProps`

`<GraphView>` props.

```typescript
interface GraphViewProps {
  /** Nodes to render. */
  nodes: GraphNode[]
  /** Edges to render. */
  edges: GraphEdge[]
  /** Fired when the user clicks (or activates) a node. */
  onNodeClick?: (node: GraphNode) => void
  /** Currently-selected node id (highlighted in the view). */
  selectedNodeId?: string
  /** Layout strategy. Defaults to `'force'`. */
  layout?: GraphLayout
  /** Custom node renderer (overrides the default circle + label). */
  nodeRenderer?: GraphNodeRenderer
  /** Custom edge renderer (overrides the default `<line>`). */
  edgeRenderer?: GraphEdgeRenderer
  /** Force-layout tunables; ignored for non-force layouts. */
  forceOptions?: ForceLayoutOptions
  /** Extra classes merged onto the outer wrapper. */
  className?: string
}
```

#### `PositionedNode`

Internal positioned node used by the renderer; the `x`/`y` coordinates
are in world (graph) space, with `(0, 0)` at the canvas centre.

```typescript
interface PositionedNode extends GraphNode {
  /** World-space X coordinate. */
  x: number
  /** World-space Y coordinate. */
  y: number
}
```

### Types

#### `GraphEdgeRenderer`

Renderer for an individual edge. Receives the edge plus both endpoints.

```typescript
type GraphEdgeRenderer = (
  edge: GraphEdge,
  source: PositionedNode,
  target: PositionedNode,
) => ReactNode
```

#### `GraphLayout`

Available layout strategies.

```typescript
type GraphLayout = 'force' | 'circular' | 'grid'
```

#### `GraphNodeRenderer`

Renderer for an individual node. Receives the positioned node.

```typescript
type GraphNodeRenderer = (node: PositionedNode) => ReactNode
```

### Functions

#### `boundingBox(nodes, padding)`

Compute the world-space bounding box of a set of positioned nodes,
with a small padding for visual breathing room.

```typescript
function boundingBox(nodes: PositionedNode[], padding?: number): { minX: number; minY: number; maxX: number; maxY: number; } | null
```

- `nodes` — Positioned nodes.
- `padding` — Padding (world units) added to every side. Default 40.

**Returns:** Bounding box `{ minX, minY, maxX, maxY }` — or `null` if empty.

#### `circularLayout(nodes, radius)`

Place nodes evenly around the unit circle (scaled by `radius`).

```typescript
function circularLayout(nodes: GraphNode[], radius: number): PositionedNode[]
```

- `nodes` — Nodes to position.
- `radius` — Circle radius in world units.

**Returns:** Positioned nodes, in input order.

#### `createRng(seed)`

Tiny deterministic PRNG (mulberry32). Allows reproducible initial
positions in tests without depending on `Math.random()`.

```typescript
function createRng(seed: number): () => number
```

- `seed` — 32-bit unsigned seed.

**Returns:** A function returning floats in `[0, 1)`.

#### `forceLayout(nodes, edges, options)`

Run a minimal velocity-Verlet force-directed simulation.

Implements:
- Pairwise repulsion (Coulomb-like, O(n²)) between every node pair.
- Spring (Hooke) attraction along each edge toward `restLength`.
- Per-step velocity damping for stability.

Stops early once the maximum per-node displacement-squared drops below
{@link CONVERGENCE_EPSILON}, or after `iterations` steps — whichever
comes first.

```typescript
function forceLayout(nodes: GraphNode[], edges: GraphEdge[], options?: ForceLayoutOptions): PositionedNode[]
```

- `nodes` — Nodes to lay out.
- `edges` — Edges (used only for attractive springs).
- `options` — Force-layout tunables.

**Returns:** Positioned nodes, in input order.

#### `GraphView(props)`

Force-directed graph view (Obsidian-style).

Renders nodes + edges into an SVG, computing positions via a built-in
minimal velocity-Verlet simulation. Three layouts are supported —
`force` (default), `circular` and `grid` — and either nodes or edges
can be overridden via custom renderers.

Style is driven by `getClassMap()`. Inline styles are reserved for
SVG geometry — `transform`, viewBox computation, stroke widths — which
classes can't express.

```typescript
function GraphView(props: GraphViewProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `props` — Component props.

**Returns:** The graph-view element.

#### `gridLayout(nodes, spacing)`

Place nodes on a square-ish grid, centred on the origin.

```typescript
function gridLayout(nodes: GraphNode[], spacing: number): PositionedNode[]
```

- `nodes` — Nodes to position.
- `spacing` — Pixel spacing between adjacent grid cells.

**Returns:** Positioned nodes, in input order.

#### `layoutNodes(nodes, edges, layout, options)`

Compute world-space positions for every node using the chosen layout.

```typescript
function layoutNodes(nodes: GraphNode[], edges: GraphEdge[], layout: GraphLayout, options?: ForceLayoutOptions): PositionedNode[]
```

- `nodes` — Nodes to position.
- `edges` — Edges (consumed only by `force`).
- `layout` — Layout strategy.
- `options` — Optional force-layout tunables (ignored for non-force).

**Returns:** Positioned nodes.

### Constants

#### `CONVERGENCE_EPSILON`

Convergence threshold (max per-node displacement squared).

```typescript
const CONVERGENCE_EPSILON: 0.01
```

#### `DEFAULT_DAMPING`

Default velocity damping used by `forceLayout`.

```typescript
const DEFAULT_DAMPING: 0.85
```

#### `DEFAULT_FORCE_ITERATIONS`

Default cap on force-layout iterations.

```typescript
const DEFAULT_FORCE_ITERATIONS: 200
```

#### `DEFAULT_REPULSION`

Default repulsion strength used by `forceLayout`.

```typescript
const DEFAULT_REPULSION: 800
```

#### `DEFAULT_REST_LENGTH`

Default ideal edge length used by `forceLayout`.

```typescript
const DEFAULT_REST_LENGTH: 80
```

#### `DEFAULT_SPRING`

Default spring stiffness used by `forceLayout`.

```typescript
const DEFAULT_SPRING: 0.05
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

Translation strings are provided by `@molecule/app-locales-feature-graph-view`.
