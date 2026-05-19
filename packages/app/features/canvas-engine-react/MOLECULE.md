# @molecule/app-canvas-engine-react

`@molecule/app-canvas-engine-react` — vector design-tool canvas
engine. Thin domain wrapper on top of
`@molecule/app-feature-canvas-react` (peer dep) that adds:

- Vector primitives — `rect`, `ellipse`, `line`, `path`, `text`, `group`
- Style fields — fill, stroke, opacity, blend mode
- Multi-select — marquee selector + shift/meta/ctrl additive click
- Alignment — `align('left' | 'center' | 'right' | 'top' | 'middle' | 'bottom')`
- Distribution — `distribute('horizontal' | 'vertical')`
- Grouping — `group()` / `ungroup()`
- Snap-to-grid — pointer-coords are snapped to `gridSize` (default 8)
- Undo/redo — bounded stack (default 100 entries)

The engine never re-implements pan/zoom — that lives in the
`<CanvasSurface>` base.

Exports:
- `<CanvasEngine>` — main component + `CanvasEngineProps`.
- `<VectorElementSvg>` — pure-presentational SVG renderer.
- `CanvasEngineHandle` — imperative ref API (undo/redo/align/group).
- `CanvasDocument`, `VectorElement` (rect/ellipse/line/path/text/group)
  and supporting types.
- `alignLayers`, `distributeLayers` — pure layer-list transforms.
- `combinedBounds`, `elementBounds`, `rectsIntersect`, `snapToGrid`,
  `translateElement`, `findElement`, `unionBounds` — geometry helpers.
- `HistoryStack`, `DEFAULT_HISTORY_LIMIT` — bounded undo/redo stack.

## Quick Start

```tsx
import { useRef, useState } from 'react'
import {
  CanvasEngine,
  type CanvasDocument,
  type CanvasEngineHandle,
  type CanvasSelection,
} from '@molecule/app-canvas-engine-react'

function Editor() {
  const ref = useRef<CanvasEngineHandle>(null)
  const [doc, setDoc] = useState<CanvasDocument>({
    width: 800,
    height: 600,
    layers: [
      { id: 'a', kind: 'rect', x: 40, y: 40, width: 120, height: 80, fill: '#3b82f6' },
    ],
  })
  const [sel, setSel] = useState<CanvasSelection>([])
  return (
    <CanvasEngine
      ref={ref}
      document={doc}
      onChange={setDoc}
      selection={sel}
      onSelectionChange={setSel}
      snapToGrid
      gridSize={8}
    />
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-canvas-engine-react @molecule/app-feature-canvas-react @molecule/app-locales-canvas-engine
```

## API

### Interfaces

#### `CanvasDocument`

Canvas document — the value model the engine renders. Pure data; no
React or DOM dependency. Mutate via `onChange` (controlled) or rely
on the engine's internal state (uncontrolled).

```typescript
interface CanvasDocument {
  /** Canvas-space document width. */
  width: number
  /** Canvas-space document height. */
  height: number
  /** Top-level layers, in z-order (last paints on top). */
  layers: VectorElement[]
}
```

#### `CanvasEngineHandle`

Imperative handle returned by `<CanvasEngine>` via `ref`. Lets the
host trigger undo/redo, alignment, grouping, etc. without lifting
every action into props.

```typescript
interface CanvasEngineHandle {
  /** Undo the last document mutation. No-op when stack empty. */
  undo: () => void
  /** Redo a previously-undone mutation. No-op when stack empty. */
  redo: () => void
  /** `true` when there is at least one entry to undo. */
  canUndo: () => boolean
  /** `true` when there is at least one entry to redo. */
  canRedo: () => boolean
  /**
   * Align all currently-selected elements along the requested edge or
   * axis. Operates on top-level layers; group children stay relative
   * to the group.
   */
  align: (mode: CanvasAlignment) => void
  /**
   * Distribute three or more selected elements evenly across the
   * given axis. No-op for fewer than three.
   */
  distribute: (axis: CanvasDistribution) => void
  /** Wrap the current selection in a new group element. */
  group: () => void
  /**
   * Ungroup every selected group element, replacing each with its
   * children at the same z position.
   */
  ungroup: () => void
}
```

#### `HistoryEntry`

Snapshot of the editor state used by the history stack.

```typescript
interface HistoryEntry {
  /** Document snapshot at this point in time. */
  document: CanvasDocument
}
```

#### `VectorElementBase`

Common fields on every {@link VectorElement} variant.

```typescript
interface VectorElementBase extends VectorStyle {
  /** Stable id for selection / history / React keys. */
  id: VectorElementId
  /** Optional transform around the element centre. */
  transform?: VectorTransform
}
```

#### `VectorEllipse`

Axis-aligned ellipse, defined by bounding-box.

```typescript
interface VectorEllipse extends VectorElementBase {
  /** Discriminator. */
  kind: 'ellipse'
  /** Canvas-space x of the bounding-box top-left corner. */
  x: number
  /** Canvas-space y of the bounding-box top-left corner. */
  y: number
  /** Bounding-box width in canvas units. */
  width: number
  /** Bounding-box height in canvas units. */
  height: number
}
```

#### `VectorGroup`

Group element — a logical bundle of children rendered together. The
group's `x`/`y`/`width`/`height` is its child bounding-box snapshot
(used for alignment ops); children remain in their absolute
canvas-space coordinates so ungrouping is trivial.

```typescript
interface VectorGroup extends VectorElementBase {
  /** Discriminator. */
  kind: 'group'
  /** Canvas-space x of the children's combined bounding-box. */
  x: number
  /** Canvas-space y of the children's combined bounding-box. */
  y: number
  /** Combined bounding-box width. */
  width: number
  /** Combined bounding-box height. */
  height: number
  /** Group children, in z-order (last paints on top). */
  children: VectorElement[]
}
```

#### `VectorLine`

Straight line between two canvas-space points.

```typescript
interface VectorLine extends VectorElementBase {
  /** Discriminator. */
  kind: 'line'
  /** Canvas-space start x. */
  x1: number
  /** Canvas-space start y. */
  y1: number
  /** Canvas-space end x. */
  x2: number
  /** Canvas-space end y. */
  y2: number
}
```

#### `VectorPath`

Free-form SVG path.

```typescript
interface VectorPath extends VectorElementBase {
  /** Discriminator. */
  kind: 'path'
  /** Canvas-space x of the path's bounding-box top-left. */
  x: number
  /** Canvas-space y of the path's bounding-box top-left. */
  y: number
  /** Canvas-space bounding-box width — used for alignment helpers. */
  width: number
  /** Canvas-space bounding-box height — used for alignment helpers. */
  height: number
  /** SVG `d` attribute, expressed in element-local coordinates. */
  d: string
}
```

#### `VectorRect`

Axis-aligned rectangle.

```typescript
interface VectorRect extends VectorElementBase {
  /** Discriminator. */
  kind: 'rect'
  /** Canvas-space x of the top-left corner. */
  x: number
  /** Canvas-space y of the top-left corner. */
  y: number
  /** Canvas-space width. */
  width: number
  /** Canvas-space height. */
  height: number
  /** Optional corner radius in canvas units. */
  cornerRadius?: number
}
```

#### `VectorStyle`

Style fields shared by every visual element kind.

```typescript
interface VectorStyle {
  /** Fill colour as any CSS colour string. Omit for transparent. */
  fill?: string
  /** Stroke colour as any CSS colour string. Omit for no stroke. */
  stroke?: string
  /** Stroke width in canvas units. Defaults to `1` when stroke set. */
  strokeWidth?: number
  /** Element opacity, `0`..`1`. Defaults to `1`. */
  opacity?: number
  /** CSS-compatible blend mode. Defaults to `'normal'`. */
  blendMode?: VectorBlendMode
}
```

#### `VectorText`

Text element rendered as an SVG `<text>`.

```typescript
interface VectorText extends VectorElementBase {
  /** Discriminator. */
  kind: 'text'
  /** Canvas-space x of the text's bounding-box top-left. */
  x: number
  /** Canvas-space y of the text's bounding-box top-left. */
  y: number
  /** Bounding-box width in canvas units (used for alignment). */
  width: number
  /** Bounding-box height in canvas units (used for alignment). */
  height: number
  /** Plain string contents. */
  text: string
  /** Font size in canvas units. Defaults to `16`. */
  fontSize?: number
  /** CSS font-family stack. Defaults to system-ui. */
  fontFamily?: string
  /** Font weight. Defaults to `'normal'`. */
  fontWeight?: 'normal' | 'bold' | number
}
```

#### `VectorTransform`

Affine 2D transform applied to a {@link VectorElement} relative to
its position. All fields are optional; omit for identity.

```typescript
interface VectorTransform {
  /** Rotation in degrees, clockwise around the element centre. */
  rotation?: number
  /** Uniform or x-axis scale (1 = identity). */
  scaleX?: number
  /** Y-axis scale (1 = identity). */
  scaleY?: number
}
```

### Types

#### `CanvasAlignment`

Alignment ops the engine exposes via {@link CanvasEngineHandle}.

```typescript
type CanvasAlignment = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'
```

#### `CanvasDistribution`

Distribution ops the engine exposes via {@link CanvasEngineHandle}.

```typescript
type CanvasDistribution = 'horizontal' | 'vertical'
```

#### `CanvasSelection`

Set-shaped selection of element ids. We use an array on the wire so
the type is JSON-serialisable (history, persistence, undo/redo).

```typescript
type CanvasSelection = readonly VectorElementId[]
```

#### `VectorBlendMode`

CSS-compatible blend mode names supported by the engine.

```typescript
type VectorBlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity'
```

#### `VectorElement`

Discriminated union of every supported element kind.

```typescript
type VectorElement =
  | VectorRect
  | VectorEllipse
  | VectorLine
  | VectorPath
  | VectorText
  | VectorGroup
```

#### `VectorElementId`

Stable identifier for a {@link VectorElement}.

```typescript
type VectorElementId = string
```

### Classes

#### `HistoryStack`

Bounded LIFO + LIFO pair backing undo/redo. State is intentionally
mutable so React refs can wrap it — every public method either
pushes/pops a snapshot or queries stack depth.

### Functions

#### `alignLayers(layers, selection, mode)`

Apply an alignment op to every selected layer, returning the new
layers array. Layers not in the selection are passed through.

```typescript
function alignLayers(layers: readonly VectorElement[], selection: CanvasSelection, mode: CanvasAlignment): VectorElement[]
```

- `layers` — Top-level layer list.
- `selection` — Ids of layers to operate on.
- `mode` — Alignment mode.

**Returns:** New layer list with aligned elements.

#### `combinedBounds(elements)`

Compute the bounding box that contains every element in the list.
Returns a zero-sized rect at the origin when `elements` is empty so
downstream code can blindly read the result.

```typescript
function combinedBounds(elements: readonly VectorElement[]): Bounds
```

- `elements` — Non-empty list of elements.

**Returns:** Combined bounding box.

#### `distributeLayers(layers, selection, axis)`

Distribute three or more selected layers evenly across the given
axis between the outermost layers (which stay put). Returns a new
layer list. For fewer than three selected items the input is
returned unchanged.

```typescript
function distributeLayers(layers: readonly VectorElement[], selection: CanvasSelection, axis: CanvasDistribution): VectorElement[]
```

- `layers` — Top-level layer list.
- `selection` — Ids of layers to operate on.
- `axis` — Distribution axis.

**Returns:** New layer list with distributed elements.

#### `elementBounds(element)`

Compute the axis-aligned bounding box of a single element. Lines
use their two endpoints; every other kind uses its `x/y/width/height`.

```typescript
function elementBounds(element: VectorElement): Bounds
```

- `element` — Element to measure.

**Returns:** Bounding box in canvas-space coordinates.

#### `findElement(elements, id)`

Look up an element by id within a flat list. Returns `undefined`
when not found — callers decide whether that's an error.

```typescript
function findElement(elements: readonly VectorElement[], id: string): VectorElement | undefined
```

- `elements` — Source list.
- `id` — Element id.

**Returns:** The matching element or `undefined`.

#### `rectsIntersect(bounds, box)`

`true` when `bounds` and `box` overlap on both axes (touching edges
count as overlap). Used by the marquee selector.

```typescript
function rectsIntersect(bounds: Bounds, box: Bounds): boolean
```

- `bounds` — First rectangle.
- `box` — Second rectangle.

**Returns:** Whether the rects intersect.

#### `snapToGrid(value, gridSize)`

Snap a value to the nearest multiple of `gridSize`. When `gridSize`
is `<= 0` the input is returned unchanged so callers don't have to
branch on "snap disabled".

```typescript
function snapToGrid(value: number, gridSize: number): number
```

- `value` — Value to snap (canvas units).
- `gridSize` — Grid spacing in canvas units. `<= 0` disables snap.

**Returns:** The snapped value.

#### `translateElement(element, dx, dy)`

Translate an element by `(dx, dy)` in canvas-space, returning a new
element. Group children are translated recursively so the group
stays internally consistent.

```typescript
function translateElement(element: VectorElement, dx: number, dy: number): VectorElement
```

- `element` — Source element.
- `dx` — X-axis displacement in canvas units.
- `dy` — Y-axis displacement in canvas units.

**Returns:** Translated element (new object).

#### `unionBounds(a, b)`

Combine two bounding boxes into the smallest axis-aligned rect that
contains both. Useful for selection envelopes and group snapshots.

```typescript
function unionBounds(a: Bounds, b: Bounds): Bounds
```

- `a` — First bounding box.
- `b` — Second bounding box.

**Returns:** The union rectangle.

### Constants

#### `DEFAULT_HISTORY_LIMIT`

Default cap matches the design spec (100 entries).

```typescript
const DEFAULT_HISTORY_LIMIT: 100
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
- `@molecule/app-locales-canvas-engine`

## Translations

Translation strings are provided by `@molecule/app-locales-canvas-engine`.
