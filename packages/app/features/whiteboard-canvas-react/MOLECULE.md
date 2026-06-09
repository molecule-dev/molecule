# @molecule/app-whiteboard-canvas-react

React whiteboard canvas — pen / marker / eraser / sticky-note /
line / arrow / shape / text tools layered on top of
`@molecule/app-feature-canvas-react`.

Pan + zoom infrastructure is delegated to `<CanvasSurface>` from
the base — this package contributes only the whiteboard-specific
tools, geometry helpers, and element types (free-form strokes,
vector shapes, sticky notes / text boxes).

Exports:
- `<WhiteboardCanvas>` — controlled canvas component. Accepts
  `strokes`, `shapes`, `stickyNotes`, `tool`, and an `onChange`
  callback fired at the end of every gesture.
- `WhiteboardSnapshot`, `WhiteboardStroke`, `WhiteboardShape`,
  `WhiteboardStickyNote`, `WhiteboardTool` types describing the
  board's element model.
- `buildStrokePath`, `buildShapePath`, `shapeBounds`,
  `applyEraserStrokes`, `strokeIntersectsPath`, `segmentsIntersect`,
  `defaultStrokeColor`, `defaultStrokeWidth`, `defaultShapeStyle`,
  `defaultStickyNoteStyle`, `generateWhiteboardId` — pure
  geometry / id helpers (no React, no DOM).

## Quick Start

```tsx
import {
  WhiteboardCanvas,
  type WhiteboardShape,
  type WhiteboardStickyNote,
  type WhiteboardStroke,
  type WhiteboardTool,
} from '@molecule/app-whiteboard-canvas-react'

function Demo() {
  const [tool, setTool] = useState<WhiteboardTool>('pen')
  const [strokes, setStrokes] = useState<WhiteboardStroke[]>([])
  const [shapes, setShapes] = useState<WhiteboardShape[]>([])
  const [stickyNotes, setStickyNotes] = useState<WhiteboardStickyNote[]>([])
  return (
    <WhiteboardCanvas
      tool={tool}
      strokes={strokes}
      shapes={shapes}
      stickyNotes={stickyNotes}
      onChange={(c) => {
        setStrokes(c.strokes)
        setShapes(c.shapes)
        setStickyNotes(c.stickyNotes)
      }}
      width={800}
      height={600}
    />
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-whiteboard-canvas-react @molecule/app-feature-canvas-react @molecule/app-locales-whiteboard-canvas-react
```

## API

### Interfaces

#### `WhiteboardCanvasProps`

{@link WhiteboardCanvas} props.

```typescript
interface WhiteboardCanvasProps {
  /**
   * Free-form strokes (pen / marker / eraser) currently on the board.
   * Controlled — feed back through `onChange`.
   */
  strokes: WhiteboardStroke[]
  /** Vector shapes on the board. Controlled. */
  shapes: WhiteboardShape[]
  /** Sticky notes / text boxes on the board. Controlled. */
  stickyNotes: WhiteboardStickyNote[]
  /**
   * Called whenever the user finishes a tool gesture that mutates the
   * board (stroke ended, shape committed, sticky placed). The payload
   * is the COMPLETE post-gesture state — replace your local arrays
   * with it.
   */
  onChange: (change: WhiteboardChange) => void
  /** Active drawing tool. */
  tool: WhiteboardTool
  /**
   * Optional override for in-flight stroke color (pen / marker only).
   * If omitted, uses {@link defaultStrokeColor} for the tool.
   */
  strokeColor?: string
  /** Optional override for stroke width. */
  strokeWidth?: number
  /**
   * Optional sticky-note background color override (used by the
   * sticky tool when placing a new note).
   */
  stickyBackground?: string
  /** Surface width in CSS pixels. */
  width: number
  /** Surface height in CSS pixels. */
  height: number
  /** Optional initial viewport (uncontrolled CanvasSurface viewport). */
  initialViewport?: CanvasViewport
  /** Optional viewport clamping limits forwarded to `<CanvasSurface>`. */
  viewportLimits?: ViewportLimits
  /**
   * If true, every drawing tool is disabled (background pan still
   * works). Useful for read-only viewers / playback mode.
   */
  readOnly?: boolean
  /** Optional aria-label override (defaults to a translated label). */
  ariaLabel?: string
  /** Extra classes merged onto the wrapper. */
  className?: string
}
```

#### `WhiteboardChange`

`onChange` payload for {@link WhiteboardCanvas}.

```typescript
interface WhiteboardChange {
  /** Updated stroke list (controlled). */
  strokes: WhiteboardStroke[]
  /** Updated shape list (controlled). */
  shapes: WhiteboardShape[]
  /** Updated sticky-note list (controlled). */
  stickyNotes: WhiteboardStickyNote[]
}
```

#### `WhiteboardShape`

A vector shape defined by two canvas-space corner points (`from`,
`to`). `rect` and `ellipse` derive their bounding rect from the
two points; `line` and `arrow` render as straight segments.

```typescript
interface WhiteboardShape {
  /** Stable id for selection / undo / realtime broadcast. */
  id: string
  /** Geometry kind. */
  kind: WhiteboardShapeKind
  /** Canvas-space start point. */
  from: Point
  /** Canvas-space end point. */
  to: Point
  /** Stroke color. */
  stroke: string
  /** Stroke width in canvas units. */
  strokeWidth: number
  /** Optional fill (rect / ellipse only). */
  fill?: string
}
```

#### `WhiteboardSnapshot`

Aggregate of every element kind on the board. This is what
persistence layers serialize, what realtime broadcasts mirror, and
what {@link WhiteboardCanvas} consumes via `strokes`, `shapes`, and
`stickyNotes` props (controlled).

```typescript
interface WhiteboardSnapshot {
  /** All free-form strokes (pen / marker / eraser) in chronological order. */
  strokes: WhiteboardStroke[]
  /** All vector shapes. */
  shapes: WhiteboardShape[]
  /** All sticky notes / text boxes. */
  stickyNotes: WhiteboardStickyNote[]
}
```

#### `WhiteboardStickyNote`

A sticky note / text box positioned in canvas-space. `width` /
`height` are canvas-space; `text` is the user-entered content.
Plain `text` tool uses the same shape but with a transparent
background.

```typescript
interface WhiteboardStickyNote {
  /** Stable id for selection / undo / realtime broadcast. */
  id: string
  /** Canvas-space top-left. */
  position: Point
  /** Canvas-space size. */
  width: number
  /** Canvas-space size. */
  height: number
  /** Note body text. */
  text: string
  /** Background fill. Use a transparent CSS color for plain text. */
  background: string
  /** Text color. */
  color: string
}
```

#### `WhiteboardStroke`

A free-form stroke (pen / marker / eraser). `points` is the raw
sampled pointer trail in canvas-space; rendering smooths the path
via quadratic Bezier midpoints. The eraser kind is itself a stroke
(so it round-trips through `onChange`) — consumers use
`applyEraserStrokes` to diff erasers against earlier strokes when
persisting.

```typescript
interface WhiteboardStroke {
  /** Stable id for selection / undo / realtime broadcast. */
  id: string
  /** Tool that produced the stroke. */
  kind: WhiteboardStrokeKind
  /** Raw sampled points in canvas-space. */
  points: Point[]
  /** CSS color string. Defaults are tool-specific. */
  color: string
  /** Stroke width in canvas units. Marker uses a fixed width. */
  width: number
}
```

### Types

#### `WhiteboardShapeKind`

Vector shape kinds the whiteboard knows how to draw.

```typescript
type WhiteboardShapeKind = 'line' | 'arrow' | 'rect' | 'ellipse'
```

#### `WhiteboardStrokeKind`

Stroke produced by the pen tool — Bezier-smoothed free-form path.

```typescript
type WhiteboardStrokeKind = 'pen' | 'marker' | 'eraser'
```

#### `WhiteboardTool`

The active tool. `select` is a no-op pass-through for the canvas —
consumers can build their own selection / move logic on top.

```typescript
type WhiteboardTool =
  | 'pen'
  | 'marker'
  | 'eraser'
  | 'sticky'
  | 'line'
  | 'arrow'
  | 'rect'
  | 'ellipse'
  | 'text'
  | 'select'
```

### Functions

#### `applyEraserStrokes(strokes)`

Apply every eraser stroke in `strokes` against the non-eraser
strokes that came before it. Returns a new array containing only
the surviving non-eraser strokes — useful when persisting a
snapshot or compacting an undo history.

Erasers themselves are dropped from the result; consumers that need
to keep them for replay should diff manually.

```typescript
function applyEraserStrokes(strokes: readonly WhiteboardStroke[]): WhiteboardStroke[]
```

- `strokes` — The full chronological stroke list.

**Returns:** Surviving non-eraser strokes (eraser entries removed).

#### `buildShapePath(shape)`

Build SVG path data for a vector shape — straight segment for
`line`, segment with a small arrowhead for `arrow`. `rect` and
`ellipse` are typically rendered as their own SVG elements; this
helper still returns a closed path for them so consumers can
fall back to `<path>` if desired.

```typescript
function buildShapePath(shape: WhiteboardShape): string
```

- `shape` — The vector shape.

**Returns:** An SVG path data string.

#### `buildStrokePath(points)`

Build an SVG path string for a free-form stroke using quadratic
Bezier midpoints — the standard "smooth pen" technique. Each
intermediate point becomes a control point and the midpoint between
adjacent points becomes the curve endpoint, which produces a
smoothly-tangent path even from sparse pointer samples.

Returns an empty string for zero-point strokes and a single
`M`-command for one-point strokes (so renderers can still emit a
dot).

```typescript
function buildStrokePath(points: readonly Point[]): string
```

- `points` — Raw sampled canvas-space points.

**Returns:** An SVG path data string.

#### `defaultShapeStyle(kind)`

Default fill / stroke palette per shape kind. Consumers override via
direct prop assignment; this is just the initial-tap default.

```typescript
function defaultShapeStyle(kind: WhiteboardShapeKind): { stroke: string; strokeWidth: number; fill?: string; }
```

- `kind` — Shape kind.

**Returns:** `{ stroke, strokeWidth, fill }` defaults.

#### `defaultStickyNoteStyle()`

Default sticky-note size + colors. Plain text-tool consumers can
override `background` to a transparent value.

```typescript
function defaultStickyNoteStyle(): { width: number; height: number; background: string; color: string; }
```

**Returns:** Default sticky-note metrics + palette.

#### `defaultStrokeColor(kind)`

Default color for a given stroke tool.

```typescript
function defaultStrokeColor(kind: WhiteboardStrokeKind): string
```

- `kind` — Stroke tool kind.

**Returns:** A CSS color string.

#### `defaultStrokeWidth(kind)`

Default stroke width in canvas units for a given tool. Marker is
intentionally fixed to communicate "highlighter"; pen / eraser are
thinner / wider.

```typescript
function defaultStrokeWidth(kind: WhiteboardStrokeKind): number
```

- `kind` — Stroke tool kind.

**Returns:** Default canvas-space stroke width.

#### `generateWhiteboardId()`

Generate an `id` unique enough for in-process selection + realtime
broadcast. Not cryptographic. Falls back gracefully when
`crypto.randomUUID` is unavailable (older Node, jsdom).

```typescript
function generateWhiteboardId(): string
```

**Returns:** A short unique id string.

#### `segmentsIntersect(a1, a2, b1, b2)`

Test whether two segments intersect using the standard CCW
orientation test. Used by {@link strokeIntersectsPath} for eraser
hit-testing against existing strokes.

Collinear endpoints only count when the bounding boxes also
overlap — otherwise two parallel-but-distant segments would
register as touching just because every CCW determinant is zero.

```typescript
function segmentsIntersect(a1: Point, a2: Point, b1: Point, b2: Point): boolean
```

- `a1` — First segment start.
- `a2` — First segment end.
- `b1` — Second segment start.
- `b2` — Second segment end.

**Returns:** `true` if the segments cross or share a touching point.

#### `shapeBounds(shape)`

Compute the axis-aligned bounding rect of a vector shape's two
canvas-space corner points. Useful for hit-testing and rendering
`rect` / `ellipse`.

```typescript
function shapeBounds(shape: WhiteboardShape): { x: number; y: number; width: number; height: number; }
```

- `shape` — The vector shape.

**Returns:** `{ x, y, width, height }` in canvas-space.

#### `strokeIntersectsPath(eraser, target)`

`true` if the eraser stroke `eraser` crosses any segment of `target`
within `tolerance` canvas units. Used by {@link applyEraserStrokes}
to diff erasers against earlier strokes.

```typescript
function strokeIntersectsPath(eraser: WhiteboardStroke, target: WhiteboardStroke): boolean
```

- `eraser` — Eraser stroke (path of points).
- `target` — Target stroke to test against.

**Returns:** `true` when the two paths cross.

#### `WhiteboardCanvas(props)`

React whiteboard canvas — pen / marker / eraser / sticky-note /
line / arrow / shape / text tools layered on top of
{@link CanvasSurface} from `@molecule/app-feature-canvas-react`.

Pan + zoom are delegated entirely to the base — this component only
handles tool-specific pointer-event interpretation and rendering of
strokes, shapes, and sticky notes inside the canvas-space inner
layer. All styling goes through `getClassMap()`; all user-facing
text goes through `t()` — both per molecule architecture rules.

Controlled state model: pass `strokes` / `shapes` / `stickyNotes`
and listen for `onChange`. Each completed gesture fires `onChange`
with the full post-gesture state.

```typescript
function WhiteboardCanvas(props: WhiteboardCanvasProps): JSX.Element
```

- `props` — Component props.

**Returns:** The whiteboard canvas element.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-feature-canvas-react` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-feature-canvas-react`
- `@molecule/app-locales-whiteboard-canvas-react`

## Translations

Translation strings are provided by `@molecule/app-locales-whiteboard-canvas`.
