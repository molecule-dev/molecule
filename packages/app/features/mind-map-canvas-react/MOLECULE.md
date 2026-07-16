# @molecule/app-mind-map-canvas-react

React mind-map canvas — thin domain wrapper over the shared canvas
base. Tree-structured nodes (parent/child links), automatic radial /
horizontal / vertical tree layout, fold/unfold subtrees, inline
edit-on-double-click, +/- toggles to add and collapse children.

Pan / zoom is delegated to `<CanvasSurface>` from
`@molecule/app-feature-canvas-react`. This package owns only the
mind-map domain semantics — adding mechanics that live above the
pan/zoom-and-paint base.

Exports:
- `<MindMapCanvas>` — top-level widget; controlled or uncontrolled.
- `MindMapNode`, `MindMapLayout`, `MindMapLayoutResult` types.
- Pure layout helpers: `computeRadialPositions`,
  `computeHorizontalTreePositions`, layout knobs + defaults.
- Pure tree mutators: `findNode`, `updateNode`, `setNodeText`,
  `toggleCollapsed`, `addChild`, `removeNode`.

## Quick Start

```tsx
import { useState } from 'react'

import { MindMapCanvas, type MindMapNode } from '@molecule/app-mind-map-canvas-react'

function Demo() {
  const [root, setRoot] = useState<MindMapNode>({
    id: 'r',
    text: 'Project',
    children: [
      { id: 'a', text: 'Plan', children: [] },
      { id: 'b', text: 'Build', children: [] },
    ],
  })
  return <MindMapCanvas root={root} onChange={setRoot} layout="radial" />
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-mind-map-canvas-react @molecule/app-feature-canvas-react @molecule/app-react @molecule/app-ui react
npm install -D @types/react
```

## API

### Interfaces

#### `LayoutOptions`

Per-layout knobs (all optional).

```typescript
interface LayoutOptions {
  /** Node width in canvas units. */
  nodeWidth?: number
  /** Node height in canvas units. */
  nodeHeight?: number
  /** Distance between concentric rings (radial layout). */
  ringSpacing?: number
  /** Horizontal step between generations (horizontal/vertical layout). */
  stepX?: number
  /** Vertical step between sibling subtrees (horizontal layout). */
  stepY?: number
  /** Origin in canvas-space for the root node's center. Defaults to `(0, 0)`. */
  origin?: Point
}
```

#### `MindMapCanvasProps`

`<MindMapCanvas>` props.

```typescript
interface MindMapCanvasProps {
  /**
   * Root of the mind-map tree. The canvas is fully-controlled when
   * `onChange` is supplied; otherwise the component manages its own
   * mirror via `useState`.
   */
  root: MindMapNode
  /**
   * Optional change callback. When provided, the canvas runs in
   * controlled mode — every fold/edit/add-child mutation calls
   * `onChange(nextRoot)` and the parent decides whether to commit.
   */
  onChange?: (next: MindMapNode) => void
  /** Layout strategy. Defaults to `'radial'`. */
  layout?: MindMapLayout
  /** Width of the surface in CSS pixels. Defaults to `800`. */
  width?: number
  /** Height of the surface in CSS pixels. Defaults to `600`. */
  height?: number
  /** Node width in canvas units. Defaults to {@link DEFAULT_NODE_WIDTH}. */
  nodeWidth?: number
  /** Node height in canvas units. Defaults to {@link DEFAULT_NODE_HEIGHT}. */
  nodeHeight?: number
  /** Fired when a node is clicked (single click, no drag). */
  onNodeClick?: (node: MindMapNode) => void
  /**
   * Fired when a node's text is committed via inline edit. Receives the
   * node id and the new text. Useful for analytics / autosave.
   */
  onNodeEdit?: (id: string, text: string) => void
  /** Extra classes merged onto the outer wrapper. */
  className?: string
}
```

#### `MindMapLayoutResult`

Result of a layout computation: a flat map of `nodeId` → canvas-space
top-left position, plus the parent/child pairs that should be drawn
as edges (in tree order, parents first). Collapsed subtrees are
omitted.

```typescript
interface MindMapLayoutResult {
  /** Map of `nodeId` → canvas-space top-left position. */
  positions: Map<string, Point>
  /** Parent/child id pairs to draw as edges. */
  edges: Array<{ parentId: string; childId: string }>
  /** Flat list of nodes that should be rendered (i.e. not hidden by a collapsed ancestor). */
  visibleNodes: MindMapNode[]
}
```

#### `MindMapNode`

One mind-map node. Every node is the root of its own subtree (the
top-level node passed as `root` is just the outermost example).

```typescript
interface MindMapNode {
  /** Stable identifier — must be unique across the entire tree. */
  id: string
  /** Display text shown in the node's body. */
  text: string
  /** Direct child subtrees, rendered in array order. */
  children: MindMapNode[]
  /**
   * If `true`, the node renders without its descendants — the subtree
   * is effectively hidden until expanded. Defaults to `false`.
   */
  collapsed?: boolean
  /**
   * Optional accent color (CSS color string). Used as the inline
   * border-left accent on the node body; ClassMap drives the rest of
   * the chrome.
   */
  color?: string
}
```

### Types

#### `MindMapLayout`

Layout strategies `<MindMapCanvas>` knows how to compute.

```typescript
type MindMapLayout = 'radial' | 'horizontal' | 'vertical'
```

### Functions

#### `addChild(root, parentId, child)`

Append a child to the node with the given id. The new child is
pushed at the end of the children array. If the parent is currently
collapsed, it is automatically expanded so the new child is visible.

```typescript
function addChild(root: MindMapNode, parentId: string, child: MindMapNode): MindMapNode
```

- `root` — Tree root.
- `parentId` — Id of the parent that will receive the new child.
- `child` — The child node to append.

**Returns:** A new tree with the child appended (and the parent expanded).

#### `computeHorizontalTreePositions(root, options, axis)`

Horizontal tidy-tree layout: root on the left, children fan out to
the right, each subtree's children stacked vertically with enough
room for every leaf descendant. The `axis` option swaps the role
of the X and Y axes for a vertical (top-down) tree.

```typescript
function computeHorizontalTreePositions(root: MindMapNode, options?: LayoutOptions, axis?: "horizontal" | "vertical"): MindMapLayoutResult
```

- `root` — Tree root.
- `options` — Optional layout knobs.
- `axis` — `'horizontal'` (default) places generations along +X;

**Returns:** Layout result with positions, edges, and the visible-node list.

#### `computeRadialPositions(root, options)`

Radial layout: root at `origin`, children fan out around it at
uniform angles, each generation living on its own concentric ring.
For deeper generations the angular slice of each child is its
parent's slice divided by the parent's child count.

```typescript
function computeRadialPositions(root: MindMapNode, options?: LayoutOptions): MindMapLayoutResult
```

- `root` — Tree root.
- `options` — Optional layout knobs.

**Returns:** Layout result with positions, edges, and the visible-node list.

#### `findNode(root, id)`

Walk the tree and find the node with the given id, returning a
pointer-style reference (not a clone). Used internally by the other
helpers — exported because it's also handy at call sites.

```typescript
function findNode(root: MindMapNode, id: string): MindMapNode | null
```

- `root` — Tree root.
- `id` — Id of the node to locate.

**Returns:** The node, or `null` if no node has that id.

#### `MindMapCanvas(props)`

Mind-map canvas — a thin domain wrapper over
`@molecule/app-feature-canvas-react`. Composes `<CanvasSurface>` for
pan/zoom, `<CanvasNode>` for each tree node, and `<CanvasEdge
kind="bezier">` for parent → child links. Domain-specific behavior
lives here, not in the base:

- **Auto-layout** — radial / horizontal / vertical positions are
  computed from the tree shape via the pure helpers in `./layout.js`.
- **Fold / unfold** — the +/- toggle on a non-leaf node flips
  `collapsed`, hiding (or revealing) the entire subtree.
- **Inline edit** — double-click any node body to enter an inline
  `<input>`; commit on Enter / blur, cancel on Escape.
- **Add child** — the `+` button on every node appends a new child
  ("New idea") and auto-expands the parent.

Pan / zoom is owned by `<CanvasSurface>`; this wrapper never
re-implements those mechanics.

Style is driven by `getClassMap()`. Inline styles are reserved for
canvas-space geometry and the optional accent border.

```typescript
function MindMapCanvas(props: MindMapCanvasProps): JSX.Element
```

- `props` — Component props.

**Returns:** The mind-map canvas element.

#### `removeNode(root, id)`

Remove the node with the given id (and its entire subtree) from the
tree. The root itself cannot be removed — passing the root id is a
no-op that returns the original tree.

```typescript
function removeNode(root: MindMapNode, id: string): MindMapNode
```

- `root` — Tree root.
- `id` — Id of the node to remove.

**Returns:** A new tree with the node removed, or the original tree if
 *   `id` matches the root.

#### `setNodeText(root, id, text)`

Set a node's text.

```typescript
function setNodeText(root: MindMapNode, id: string, text: string): MindMapNode
```

- `root` — Tree root.
- `id` — Id of the node to edit.
- `text` — New text content.

**Returns:** A new tree with the node's text updated.

#### `toggleCollapsed(root, id)`

Toggle a node's `collapsed` flag.

```typescript
function toggleCollapsed(root: MindMapNode, id: string): MindMapNode
```

- `root` — Tree root.
- `id` — Id of the node to toggle.

**Returns:** A new tree with the node's collapsed flag flipped.

#### `updateNode(root, id, updater)`

Apply a transformation to the node with the given id, returning a
new tree where every ancestor of the touched node has been re-cloned
so React-style reference equality remains correct on unchanged
subtrees.

```typescript
function updateNode(root: MindMapNode, id: string, updater: (node: MindMapNode) => MindMapNode): MindMapNode
```

- `root` — Tree root.
- `id` — Id of the node to update.
- `updater` — Function that returns the replacement node.

**Returns:** A new tree, or the original if `id` was not found.

#### `walkVisible(root, visit)`

Walk the tree and call `visit(node, parent | null, depth)` for every
node not hidden by a collapsed ancestor. Visits in pre-order.

```typescript
function walkVisible(root: MindMapNode, visit: (node: MindMapNode, parent: MindMapNode | null, depth: number) => void): void
```

- `root` — Tree root.
- `visit` — Callback invoked once per visible node.

### Constants

#### `DEFAULT_HORIZONTAL_STEP_X`

Default horizontal tree per-generation step in canvas units.

```typescript
const DEFAULT_HORIZONTAL_STEP_X: 220
```

#### `DEFAULT_HORIZONTAL_STEP_Y`

Default horizontal tree per-leaf step in canvas units.

```typescript
const DEFAULT_HORIZONTAL_STEP_Y: 72
```

#### `DEFAULT_NODE_HEIGHT`

Default canvas-space height of one node.

```typescript
const DEFAULT_NODE_HEIGHT: 48
```

#### `DEFAULT_NODE_WIDTH`

Default canvas-space size of one node, used to space siblings.

```typescript
const DEFAULT_NODE_WIDTH: 160
```

#### `DEFAULT_RADIAL_RING`

Default radial ring spacing in canvas units.

```typescript
const DEFAULT_RADIAL_RING: 180
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-feature-canvas-react` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-feature-canvas-react`
- `@molecule/app-react`
- `@molecule/app-ui`
- `react`

Requires a wired ClassMap bond (`setClassMap(...)` at startup) and a
React `I18nProvider` ancestor — `getClassMap()` and `useTranslation()`
both throw before wiring. Pair with the companion locale bond
`@molecule/app-locales-mind-map-canvas` for translated aria labels and
the "New idea" default child text (English fallbacks otherwise).

The surface is FIXED-SIZE: `width` / `height` are pixel props
(default 800x600) — the canvas does not track its parent's size. To
fill a panel, measure the parent (e.g. a resize observer) and pass
the measured pixels down; CSS alone will clip, not resize.

Supplying `onChange` makes the tree fully controlled (every
fold / edit / add-child calls it with the next root); omitting it lets
the canvas manage an internal copy seeded from `root`.

## Translations

Translation strings are provided by `@molecule/app-locales-mind-map-canvas`.
