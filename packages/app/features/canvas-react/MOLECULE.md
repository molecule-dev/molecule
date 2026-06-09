# @molecule/app-feature-canvas-react

React canvas primitives — the SHARED BASE for canvas-family wrappers
(whiteboard, mind-map, design-canvas, presentation slide-canvas).

This package provides only the generic mechanics every canvas variant
uses: pan/zoom/select/transform infrastructure, node/edge primitives,
pointer-event utilities, and pure coordinate-transform helpers.

Domain-specific behavior (whiteboard drawing tools, mind-map auto-
layout, design-canvas vector ops) lives in the wrapper packages,
which consume this base as a peer dependency.

Exports:
- `<CanvasSurface>` — pan/zoom container; children render in
  canvas-coordinate-space. Wheel zooms around the cursor; primary
  drag on the empty surface pans.
- `<CanvasNode>` — generic positioned + draggable + resizable
  wrapper that lives inside the surface's canvas-space layer.
- `<CanvasEdge>` — generic edge between two canvas-space points,
  with `'line'`, `'bezier'`, or `'orthogonal'` geometry.
- `useCanvasViewport()` — viewport state hook with `panBy` / `zoomBy`
  helpers and optional clamping.
- `useCanvasSelection()` — selection-set hook with idiomatic toggles.
- `screenToCanvas`, `canvasToScreen`, `clampViewport`, `fitToBounds`
  — pure coordinate-transform helpers.
- `buildEdgePath` — pure SVG path builder used by `<CanvasEdge>`.
- `CanvasViewport`, `Point`, `Size`, `Bounds`, `ViewportLimits`,
  `CanvasEdgeKind`, `CanvasItemId`, `CanvasDragInfo`,
  `CanvasResizeInfo` types.

## Quick Start

```tsx
import {
  CanvasSurface,
  CanvasNode,
  CanvasEdge,
  useCanvasViewport,
  useCanvasSelection,
  type CanvasViewport,
} from '@molecule/app-feature-canvas-react'

function Demo() {
  const { viewport, setViewport } = useCanvasViewport()
  const { selected, toggle } = useCanvasSelection()
  return (
    <CanvasSurface
      viewport={viewport}
      onViewportChange={setViewport}
      width={800}
      height={600}
    >
      <CanvasNode
        id="a"
        position={{ x: 100, y: 100 }}
        size={{ width: 80, height: 40 }}
        selected={selected.has('a')}
        onSelect={(id) => id && toggle(id)}
      />
      <CanvasEdge from={{ x: 180, y: 120 }} to={{ x: 280, y: 200 }} kind="bezier" />
    </CanvasSurface>
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-feature-canvas-react
```

## API

### Interfaces

#### `Bounds`

An axis-aligned rectangle in canvas-space (top-left origin, +x right,
+y down). Used for selection regions, content bounds, fitting, etc.

```typescript
interface Bounds {
  /** Left edge in canvas units. */
  x: number
  /** Top edge in canvas units. */
  y: number
  /** Width in canvas units. */
  width: number
  /** Height in canvas units. */
  height: number
}
```

#### `CanvasDragInfo`

Drag callback payload for `<CanvasNode>`. `delta` is the canvas-space
displacement applied since the previous `onDrag` call within the same
gesture. `position` is the new canvas-space top-left of the node.

```typescript
interface CanvasDragInfo {
  /** New canvas-space top-left position of the node. */
  position: Point
  /** Canvas-space delta since the previous drag tick. */
  delta: Point
  /** `true` on the very first move of a gesture. */
  start: boolean
  /** `true` on the final pointer-up of a gesture. */
  end: boolean
}
```

#### `CanvasEdgeProps`

`<CanvasEdge>` props.

```typescript
interface CanvasEdgeProps {
  /** Edge starting point in canvas-space. */
  from: Point
  /** Edge ending point in canvas-space. */
  to: Point
  /**
   * Edge geometry. `'line'` is a straight segment, `'bezier'` is a
   * cubic with horizontal-first handles, `'orthogonal'` is a
   * right-angle path that goes horizontal-then-vertical from `from`.
   * Defaults to `'line'`.
   */
  kind?: CanvasEdgeKind
  /** Stroke width in canvas units. Defaults to `2`. */
  strokeWidth?: number
  /** SVG `stroke` attribute (color). Defaults to `'currentColor'`. */
  stroke?: string
  /** Optional aria-label override (defaults to a translated label). */
  ariaLabel?: string
  /** Extra classes merged onto the wrapper. */
  className?: string
}
```

#### `CanvasNodeProps`

`<CanvasNode>` props.

```typescript
interface CanvasNodeProps {
  /** Optional id, surfaced on `data-canvas-node-id` and via `onSelect`. */
  id?: CanvasItemId
  /** Canvas-space top-left position of the node. */
  position: Point
  /** Optional canvas-space size. If omitted, the node sizes to content. */
  size?: Size
  /** Whether the node is currently selected (drives data attributes only). */
  selected?: boolean
  /**
   * Called when the user activates the node (pointerdown that doesn't
   * become a drag). Receives the node id (if set) and the original
   * pointer event so consumers can read modifier keys for additive
   * selection.
   */
  onSelect?: (id: CanvasItemId | undefined, e: ReactPointerEvent<HTMLDivElement>) => void
  /**
   * Called continuously during a drag gesture. The base does NOT
   * mutate `position` itself — consumers update their own state from
   * `info.position` and feed it back through props.
   *
   * Drag deltas are computed in CANVAS-space using the surface's
   * current zoom (read from the parent surface's `data-canvas-zoom`).
   */
  onDrag?: (info: CanvasDragInfo) => void
  /**
   * Called continuously during a resize gesture from the SE corner.
   * `info.size` is canvas-space; `info.position` matches the original
   * top-left (resize-from-SE doesn't shift the origin).
   */
  onResize?: (info: CanvasResizeInfo) => void
  /** Optional aria-label override (defaults to a translated label). */
  ariaLabel?: string
  /** Children render inside the node, in canvas-space. */
  children?: ReactNode
  /** Extra classes merged onto the wrapper. */
  className?: string
}
```

#### `CanvasResizeInfo`

Resize callback payload for `<CanvasNode>`. `size` is the new
canvas-space size; `position` is the new canvas-space top-left
(resize from a non-bottom-right handle moves the origin too).

```typescript
interface CanvasResizeInfo {
  /** New canvas-space top-left position of the node. */
  position: Point
  /** New canvas-space size of the node. */
  size: Size
  /** `true` on the final pointer-up of a gesture. */
  end: boolean
}
```

#### `CanvasSurfaceProps`

`<CanvasSurface>` props.

```typescript
interface CanvasSurfaceProps {
  /**
   * Controlled viewport. If omitted, the surface manages its own
   * viewport state via {@link useCanvasViewport}.
   */
  viewport?: CanvasViewport
  /**
   * Initial viewport (uncontrolled mode only). Ignored when `viewport`
   * is supplied.
   */
  initialViewport?: CanvasViewport
  /**
   * Called whenever the viewport changes (pan, zoom, or external set).
   * Required when `viewport` is supplied (controlled mode).
   */
  onViewportChange?: (next: CanvasViewport) => void
  /** Optional clamping limits applied on every viewport update. */
  limits?: ViewportLimits
  /**
   * Wheel-zoom factor per scroll tick. Multiplied for zoom-in (deltaY < 0)
   * and divided for zoom-out (deltaY > 0). Defaults to `1.1`.
   */
  zoomFactor?: number
  /**
   * If `true`, dragging anywhere on the surface pans (children that
   * stop propagation on pointerdown will still capture their own
   * gestures — the typical pattern for nodes). Defaults to `true`.
   */
  panOnDrag?: boolean
  /**
   * Called when an empty-area pointerdown fires. Useful for clearing
   * selection on background clicks.
   */
  onBackgroundPointerDown?: (e: ReactPointerEvent<HTMLDivElement>) => void
  /** Width of the surface in CSS pixels. */
  width: number
  /** Height of the surface in CSS pixels. */
  height: number
  /** Optional aria-label override (defaults to a translated label). */
  ariaLabel?: string
  /** Children render in canvas-coordinate-space (transformed by viewport). */
  children?: ReactNode
  /** Extra classes merged onto the outer wrapper. */
  className?: string
}
```

#### `CanvasViewport`

Viewport state — the camera over the canvas. `(x, y)` is the
canvas-space coordinate that maps to the surface's top-left corner.
`zoom` is the scale factor (1 = identity, 2 = 2x zoom-in, 0.5 = zoom-out).

```typescript
interface CanvasViewport {
  /** Canvas-space x at the surface's top-left corner. */
  x: number
  /** Canvas-space y at the surface's top-left corner. */
  y: number
  /** Scale factor (1 = identity, > 1 = zoomed in). */
  zoom: number
}
```

#### `Point`

A 2D point in either screen-space or canvas-space.

```typescript
interface Point {
  /** X coordinate. */
  x: number
  /** Y coordinate. */
  y: number
}
```

#### `Size`

A 2D size in either screen-space or canvas-space.

```typescript
interface Size {
  /** Width in the relevant coordinate space. */
  width: number
  /** Height in the relevant coordinate space. */
  height: number
}
```

#### `UseCanvasSelectionResult`

Result of {@link useCanvasSelection}.

```typescript
interface UseCanvasSelectionResult {
  /** Read-only selected ids. */
  selected: ReadonlySet<CanvasItemId>
  /** `true` if `id` is in the selection. */
  isSelected: (id: CanvasItemId) => boolean
  /**
   * Replace the selection. If `additive` is true, `ids` are merged into
   * the existing selection; otherwise the selection is replaced.
   */
  select: (ids: readonly CanvasItemId[], additive?: boolean) => void
  /** Toggle a single id's membership. */
  toggle: (id: CanvasItemId) => void
  /** Remove a single id. */
  deselect: (id: CanvasItemId) => void
  /** Clear the entire selection. */
  clear: () => void
}
```

#### `UseCanvasViewportResult`

Result of {@link useCanvasViewport}.

```typescript
interface UseCanvasViewportResult {
  /** Current viewport. */
  viewport: CanvasViewport
  /** Replace the viewport (clamped to `limits` if supplied). */
  setViewport: (next: CanvasViewport) => void
  /** Pan by a screen-space delta in pixels (interpreted via the current zoom). */
  panBy: (deltaX: number, deltaY: number) => void
  /**
   * Zoom around a screen-space focal point. `factor > 1` zooms in,
   * `< 1` zooms out. The focal point's canvas-space position is held
   * fixed across the zoom.
   */
  zoomBy: (factor: number, focalScreenX: number, focalScreenY: number) => void
  /** Reset to the initial viewport. */
  reset: () => void
}
```

#### `ViewportLimits`

Optional clamping limits for the viewport. All fields are optional;
omitted limits are unbounded. `bounds` constrains where `(x, y)` may
sit; `minZoom` / `maxZoom` clamp the zoom factor.

```typescript
interface ViewportLimits {
  /** Allowed range for the viewport origin. Omit for unbounded. */
  bounds?: Bounds
  /** Minimum allowed zoom. Defaults to no minimum. */
  minZoom?: number
  /** Maximum allowed zoom. Defaults to no maximum. */
  maxZoom?: number
}
```

### Types

#### `CanvasEdgeKind`

Kinds of edge geometry `<CanvasEdge>` knows how to draw.

```typescript
type CanvasEdgeKind = 'line' | 'bezier' | 'orthogonal'
```

#### `CanvasItemId`

Identifier for a selectable item. Generic strings so consumers can
use whatever id scheme matches their domain (uuid, slug, db id, etc.).

```typescript
type CanvasItemId = string
```

### Functions

#### `buildEdgePath(from, to, kind)`

Build the SVG `path` `d` attribute for one of the supported edge kinds.

```typescript
function buildEdgePath(from: Point, to: Point, kind: CanvasEdgeKind): string
```

- `from` — Edge start in canvas-space.
- `to` — Edge end in canvas-space.
- `kind` — Edge geometry.

**Returns:** SVG path data.

#### `CanvasEdge(props)`

Generic edge between two canvas-space points. Renders an absolutely-
positioned SVG that spans the bounding box of the two endpoints (with
a small overflow margin so curves and bezier handles aren't clipped).

Domain semantics (which nodes are connected, edge labels, arrowheads,
directionality) live in wrapper packages — this base just draws the
geometry.

```typescript
function CanvasEdge(props: CanvasEdgeProps): JSX.Element
```

- `props` — Component props.

**Returns:** The edge element.

#### `CanvasNode(props)`

Generic positioned + draggable + resizable wrapper. Renders into the
canvas-coordinate-space layer of `<CanvasSurface>`.

The base is intentionally minimal — it owns:
  - absolute positioning at `position` (canvas units).
  - optional explicit `size` (canvas units).
  - `onSelect` on pointerdown (with `e.stopPropagation()` so the
    surface doesn't pan).
  - `onDrag` from any pointerdown on the node body.
  - `onResize` from a SE-corner handle (only rendered if `onResize`
    is supplied).

It does NOT own visual chrome — wrapper packages compose chrome on
top via `children`.

```typescript
function CanvasNode(props: CanvasNodeProps): JSX.Element
```

- `props` — Component props.

**Returns:** The node element.

#### `CanvasSurface(props)`

Pan/zoom container — the shared base every canvas variant builds on.

Wheel scroll zooms around the cursor; primary-button drag on the
empty surface pans; children render inside a CSS-transformed inner
layer so they live in canvas-coordinate-space (use
`screenToCanvas` / `canvasToScreen` to translate as needed).

Children that handle their own pointer gestures (e.g.
`<CanvasNode>`) should call `e.stopPropagation()` on pointerdown to
suppress surface pan.

Style is driven entirely by `getClassMap()`; inline styles are
reserved for things ClassMap can't express (transforms,
touch-action, viewport-derived offsets).

```typescript
function CanvasSurface(props: CanvasSurfaceProps): JSX.Element
```

- `props` — Component props.

**Returns:** The canvas surface element.

#### `canvasToScreen(point, viewport)`

Convert a canvas-space point into screen-space (relative to the
surface's top-left). Inverse of {@link screenToCanvas}.

```typescript
function canvasToScreen(point: Point, viewport: CanvasViewport): Point
```

- `point` — Canvas-space point.
- `viewport` — Current viewport state.

**Returns:** The same point expressed in screen-space pixels.

#### `clampViewport(viewport, limits)`

Clamp a viewport to optional limits. `bounds` (if provided) constrains
where the viewport origin may sit; `minZoom` / `maxZoom` clamp zoom.
Returns a new viewport — does not mutate the input.

If `bounds` is provided AND has positive width/height, the origin is
clamped so the surface still overlaps the bounds when fully zoomed
out. (Wrappers can layer richer rules on top via `onViewportChange`.)

```typescript
function clampViewport(viewport: CanvasViewport, limits?: ViewportLimits): CanvasViewport
```

- `viewport` — The desired viewport.
- `limits` — Optional clamping limits.

**Returns:** A clamped viewport.

#### `fitToBounds(bounds, surface, padding)`

Compute the viewport that fits a canvas-space bounds rectangle into a
surface of the given screen-space size, with optional padding (in
screen-space pixels) around the content.

The returned viewport centers the content, but if either dimension
is zero the center is well-defined (the bounds origin) and zoom is
clamped to `1`.

```typescript
function fitToBounds(bounds: Bounds, surface: Size, padding?: number): CanvasViewport
```

- `bounds` — Canvas-space content rectangle to fit.
- `surface` — Screen-space size of the surface.
- `padding` — Screen-space padding around the content (default 0).

**Returns:** A viewport that frames `bounds` inside the surface.

#### `screenToCanvas(point, viewport)`

Convert a screen-space point (relative to the surface's top-left)
into canvas-space. Inverse of {@link canvasToScreen}.

```typescript
function screenToCanvas(point: Point, viewport: CanvasViewport): Point
```

- `point` — Screen-space point in pixels.
- `viewport` — Current viewport state.

**Returns:** The same point expressed in canvas-space.

#### `useCanvasSelection(options, options, options, options)`

Manage a selection set of canvas item ids with idiomatic helpers.
Pure JS state — no DOM coupling, no domain assumptions.

Controlled mode: pass `value` + `onChange`. Uncontrolled mode: omit
both; the hook owns its own state seeded from `initial`.

```typescript
function useCanvasSelection(options?: { initial?: readonly CanvasItemId[]; value?: ReadonlySet<CanvasItemId>; onChange?: (next: ReadonlySet<CanvasItemId>) => void; }): UseCanvasSelectionResult
```

- `options` — Hook options.
- `options` — .initial - Initial selection set (default empty).
- `options` — .value - External selection (controlled mode).
- `options` — .onChange - External setter (controlled mode).

**Returns:** The selection set + helpers.

#### `useCanvasViewport(options, options, options, options, options)`

Manage canvas viewport state with optional clamping limits. May be
used controlled (pass `value` + `onChange`) or uncontrolled (omit
both — it manages its own state seeded from `initial`).

```typescript
function useCanvasViewport(options?: { initial?: CanvasViewport; limits?: ViewportLimits; value?: CanvasViewport; onChange?: (next: CanvasViewport) => void; }): UseCanvasViewportResult
```

- `options` — Hook options.
- `options` — .initial - Initial viewport (default `{ x: 0, y: 0, zoom: 1 }`).
- `options` — .limits - Optional clamping limits applied on every update.
- `options` — .value - External viewport state (controlled mode).
- `options` — .onChange - External setter (controlled mode).

**Returns:** The viewport state + helpers (`panBy`, `zoomBy`, `reset`).

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-feature-canvas`.
