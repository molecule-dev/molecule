# @molecule/api-canvas-render

Server-side canvas rendering for molecule.dev. Takes a
`CanvasDocument` (width / height / background / layered shapes & text)
and returns a `Buffer` for PNG, SVG, or PDF.

Wraps `@napi-rs/canvas` for the PNG raster path; SVG and PDF are emitted
as pure strings (no native dependency required for those formats).

## Quick Start

```ts
import { renderCanvasDocument } from '@molecule/api-canvas-render'

const result = await renderCanvasDocument(
  {
    width: 800,
    height: 600,
    background: '#ffffff',
    layers: [
      { kind: 'rect', x: 20, y: 20, width: 200, height: 80,
        fill: '#3b82f6', radius: 8 },
      { kind: 'text', x: 40, y: 70, text: 'Hello',
        fontSize: 32, fill: '#ffffff' },
    ],
  },
  { format: 'png', dpi: 2 },
)

import { writeFile } from 'node:fs/promises'
await writeFile(`canvas.${result.extension}`, result.buffer)
```

```ts
// HTTP handler — Express adapter
import { createCanvasRenderHandler } from '@molecule/api-canvas-render'

const handle = createCanvasRenderHandler()
router.post('/canvas/render', async (req, res, next) => {
  try {
    await handle(
      { body: req.body },
      {
        setHeader: (n, v) => res.setHeader(n, v),
        setStatus: (s) => { res.status(s) },
        sendBuffer: (b) => { res.end(b) },
        sendJson: (j) => { res.json(j) },
      },
    )
  } catch (err) { next(err) }
})
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-canvas-render @napi-rs/canvas
```

## API

### Interfaces

#### `Canvas2DContext`

Subset of the HTML5 2D canvas API used by the renderer. Real
`@napi-rs/canvas` contexts satisfy this; tests can satisfy it with
spy-backed objects.

```typescript
interface Canvas2DContext {
  fillStyle: string
  strokeStyle: string
  lineWidth: number
  globalAlpha: number
  font: string
  textAlign: 'left' | 'center' | 'right' | 'start' | 'end'
  textBaseline: 'top' | 'middle' | 'alphabetic' | 'bottom' | 'hanging' | 'ideographic'
  save(): void
  restore(): void
  translate(x: number, y: number): void
  rotate(angle: number): void
  scale(x: number, y: number): void
  beginPath(): void
  closePath(): void
  rect(x: number, y: number, w: number, h: number): void
  moveTo(x: number, y: number): void
  lineTo(x: number, y: number): void
  ellipse(
    x: number,
    y: number,
    rx: number,
    ry: number,
    rotation: number,
    start: number,
    end: number,
  ): void
  fill(): void
  stroke(): void
  fillText(text: string, x: number, y: number): void
  strokeText(text: string, x: number, y: number): void
  fillRect(x: number, y: number, w: number, h: number): void
  drawImage(image: any, x: number, y: number, w: number, h: number): void

  loadImage?: (source: any) => Promise<any>
}
```

#### `CanvasDocument`

Top-level canvas document consumed by {@link renderCanvasDocument}.

```typescript
interface CanvasDocument {
  /** Document width in user-space units (CSS pixels at DPI 1). */
  width: number
  /** Document height in user-space units. */
  height: number
  /** Optional background color (CSS string). Omit for transparent. */
  background?: string
  /** Layers, drawn in array order (later = on top). */
  layers: Layer[]
}
```

#### `CanvasLike`

The minimal canvas surface used by the renderer.

```typescript
interface CanvasLike {
  getContext(kind: '2d'): Canvas2DContext
  toBuffer(mimeType: 'image/png'): Buffer
}
```

#### `CanvasModule`

The narrow slice of `@napi-rs/canvas` we depend on. Declaring it here keeps
the test seam minimal — a mock just needs `createCanvas(w, h)` returning
`{ getContext, toBuffer }`.

```typescript
interface CanvasModule {
  createCanvas: (width: number, height: number) => CanvasLike
}
```

#### `CanvasRenderRequest`

Minimal request shape consumed by {@link createCanvasRenderHandler}.

```typescript
interface CanvasRenderRequest {
  /** Parsed JSON body — `{ doc, options }` envelope. */
  body: unknown
}
```

#### `CanvasRenderResponse`

Minimal response shape consumed by {@link createCanvasRenderHandler}.

```typescript
interface CanvasRenderResponse {
  /** Set a single response header. */
  setHeader: (name: string, value: string) => void
  /** Set the HTTP status code. */
  setStatus: (status: number) => void
  /** Write a binary buffer body and end the response. */
  sendBuffer: (buffer: Buffer) => void
  /** Write a JSON body and end the response. */
  sendJson: (body: unknown) => void
}
```

#### `CreateCanvasRenderHandlerOptions`

Options for {@link createCanvasRenderHandler}.

```typescript
interface CreateCanvasRenderHandlerOptions {
  /**
   * Optional pre-flight validator. Throw to reject the request; the thrown
   * error's `.message` becomes the JSON `error` field with HTTP 400.
   */
  validate?: (doc: CanvasDocument, options: RenderOptions) => void | Promise<void>
  /** Default suggested filename (without extension). Defaults to `'canvas'`. */
  filename?: string
}
```

#### `EllipseLayer`

Axis-aligned ellipse described by its bounding-box corner + size.

```typescript
interface EllipseLayer extends ShapeStyle, Transform {
  kind: 'ellipse'
  x: number
  y: number
  width: number
  height: number
}
```

#### `GroupLayer`

Group layer — applies its `Transform` to every child, then renders them
in array order (later = on top).

```typescript
interface GroupLayer extends Transform {
  kind: 'group'
  children: Layer[]
}
```

#### `ImageLayer`

Image element. Source is one of:
- `src` — an `http(s):` URL (raster) — only honoured by PNG output.
- `data` — a `data:` URI (e.g. `data:image/png;base64,...`).
- `buffer` — a raw `Buffer` of PNG/JPEG bytes (encoded to data URI).

Exactly one of `src`, `data`, `buffer` must be provided.

```typescript
interface ImageLayer extends Transform {
  kind: 'image'
  x: number
  y: number
  width: number
  height: number
  src?: string
  data?: string
  buffer?: Buffer
  /** MIME type when supplying `buffer`. Defaults to `image/png`. */
  mimeType?: string
}
```

#### `LineLayer`

Single straight line segment.

```typescript
interface LineLayer extends ShapeStyle, Transform {
  kind: 'line'
  x1: number
  y1: number
  x2: number
  y2: number
}
```

#### `PathLayer`

Arbitrary path described by an SVG-style command string (M/L/C/Q/Z…).

```typescript
interface PathLayer extends ShapeStyle, Transform {
  kind: 'path'
  /** SVG path data (`"M0,0 L10,10 Z"`). */
  d: string
}
```

#### `RectLayer`

Axis-aligned rectangle, optionally with rounded corners.

```typescript
interface RectLayer extends ShapeStyle, Transform {
  kind: 'rect'
  /** Top-left X. */
  x: number
  /** Top-left Y. */
  y: number
  width: number
  height: number
  /** Optional uniform corner radius. */
  radius?: number
}
```

#### `RenderOptions`

Options accepted by {@link renderCanvasDocument}.

```typescript
interface RenderOptions {
  /** Output format. */
  format: CanvasRenderFormat
  /**
   * Override the rendered width (user-space units). When set, the document is
   * scaled uniformly to fit. Defaults to `document.width`.
   */
  width?: number
  /**
   * Override the rendered height. Defaults to `document.height`.
   */
  height?: number
  /**
   * Pixels-per-user-space-unit for raster output (PNG). Defaults to 1.
   * For "retina" PNGs, pass `2`.
   */
  dpi?: number
}
```

#### `RenderResult`

Result of {@link renderCanvasDocument}.

```typescript
interface RenderResult {
  buffer: Buffer
  /** MIME type of the buffer — `image/png`, `image/svg+xml`, `application/pdf`. */
  contentType: string
  /** Suggested filename extension (no leading dot). */
  extension: 'png' | 'svg' | 'pdf'
}
```

#### `ShapeStyle`

Style fields shared by drawable layers. All colors are CSS-style strings
(e.g. `"#1f2937"`, `"rgba(0,0,0,0.5)"`, `"transparent"`).

```typescript
interface ShapeStyle {
  /** Fill color. Omit for no fill. */
  fill?: string
  /** Stroke color. Omit for no stroke. */
  stroke?: string
  /** Stroke width in user-space units. Defaults to 1 when `stroke` is set. */
  strokeWidth?: number
}
```

#### `TextLayer`

A run of text rendered at a baseline anchor.

```typescript
interface TextLayer extends Transform {
  kind: 'text'
  x: number
  y: number
  text: string
  /** Font family (e.g. `"Inter"`, `"Arial"`). Defaults to `"sans-serif"`. */
  fontFamily?: string
  /** Font size in user-space units. Defaults to 16. */
  fontSize?: number
  /** Font weight (`"normal"`, `"bold"`, `100`..`900`). Defaults to `"normal"`. */
  fontWeight?: string | number
  /** Italic style. Defaults to `false`. */
  italic?: boolean
  /** Fill color. Defaults to `"#000000"`. */
  fill?: string
  /** Stroke color. Omit for no stroke. */
  stroke?: string
  /** Stroke width. Defaults to 1 when `stroke` is set. */
  strokeWidth?: number
  /** Horizontal alignment relative to `(x, y)`. Defaults to `"left"`. */
  align?: 'left' | 'center' | 'right'
  /** Vertical alignment / baseline. Defaults to `"alphabetic"`. */
  baseline?: 'top' | 'middle' | 'alphabetic' | 'bottom'
}
```

#### `Transform`

2D affine transform applied to a layer (and its children, when the layer
is a {@link GroupLayer}). Values are in the document's user-space
coordinate system. Order is `translate(x, y) → rotate(rotation) → scale(sx, sy)`.

```typescript
interface Transform {
  /** Translate X (user-space units). Defaults to 0. */
  x?: number
  /** Translate Y (user-space units). Defaults to 0. */
  y?: number
  /** Rotation around the layer's local origin, in degrees. Defaults to 0. */
  rotation?: number
  /** Horizontal scale factor. Defaults to 1. */
  scaleX?: number
  /** Vertical scale factor. Defaults to 1. */
  scaleY?: number
  /** Opacity, 0..1. Defaults to 1. */
  opacity?: number
}
```

### Types

#### `CanvasRenderFormat`

Supported output formats. Driven by the `format` option on
{@link RenderOptions}.

```typescript
type CanvasRenderFormat = 'png' | 'svg' | 'pdf'
```

#### `Layer`

Discriminated union of every layer kind.

```typescript
type Layer =
  | RectLayer
  | EllipseLayer
  | LineLayer
  | PathLayer
  | TextLayer
  | ImageLayer
  | GroupLayer
```

### Functions

#### `createCanvasRenderHandler(handlerOptions)`

Build a `(req, res) => Promise<void>` handler that invokes
{@link renderCanvasDocument} and streams the resulting buffer back.

```typescript
function createCanvasRenderHandler(handlerOptions?: CreateCanvasRenderHandlerOptions): (req: CanvasRenderRequest, res: CanvasRenderResponse) => Promise<void>
```

- `handlerOptions` — Optional pre-flight validator + filename default.

**Returns:** An async handler accepting `{ body }` and a response shim.

#### `loadCanvasModule()`

Load `@napi-rs/canvas` dynamically. Cached after first resolution. Tests
use {@link setCanvasModule} to inject a mock instead of requiring
`vi.mock`-style global rewrites.

```typescript
function loadCanvasModule(): Promise<CanvasModule>
```

**Returns:** The resolved canvas module.

#### `renderCanvasDocument(doc, options)`

Render a {@link CanvasDocument} into a {@link RenderResult}. The output
format is chosen by `options.format`.

```typescript
function renderCanvasDocument(doc: CanvasDocument, options: RenderOptions): Promise<RenderResult>
```

- `doc` — The canvas document.
- `options` — Format + sizing options.

**Returns:** Buffer + content-type + extension.

#### `renderPdf(doc, options)`

Render a {@link CanvasDocument} as a `Buffer` containing a single-page PDF.

```typescript
function renderPdf(doc: CanvasDocument, options: RenderOptions): Buffer<ArrayBufferLike>
```

- `doc` — Document to render.
- `options` — Output sizing options. `dpi` is ignored.

**Returns:** A PDF buffer (starts with the `%PDF-` header).

#### `renderPng(doc, options)`

Render a {@link CanvasDocument} as a PNG `Buffer`.

```typescript
function renderPng(doc: CanvasDocument, options: RenderOptions): Promise<Buffer<ArrayBufferLike>>
```

- `doc` — Document to render.
- `options` — Output sizing / DPI options.

**Returns:** A PNG buffer (starts with the standard `89 50 4E 47` signature).

#### `renderSvg(doc, options)`

Render a {@link CanvasDocument} as an SVG `Buffer` (UTF-8).

```typescript
function renderSvg(doc: CanvasDocument, options: RenderOptions): Buffer<ArrayBufferLike>
```

- `doc` — Document to render.
- `options` — Output sizing options. `dpi` is ignored (SVG is vector).

**Returns:** A Buffer containing the SVG XML body.

#### `setCanvasModule(mod)`

Override the canvas module used by {@link renderPng}. Pass `undefined` to
clear the override and revert to the real `@napi-rs/canvas`.

```typescript
function setCanvasModule(mod: CanvasModule | undefined): void
```

- `mod` — Module shim, or `undefined` to clear.

### Constants

#### `PDF_CONTENT_TYPE`

```typescript
const PDF_CONTENT_TYPE: "application/pdf"
```

#### `PNG_CONTENT_TYPE`

```typescript
const PNG_CONTENT_TYPE: "image/png"
```

#### `SVG_CONTENT_TYPE`

```typescript
const SVG_CONTENT_TYPE: "image/svg+xml"
```

## Injection Notes

### Runtime Dependencies

- `@napi-rs/canvas`

The renderer is a pure function of its inputs — no fetch, no global state,
no implicit locale handling. Locale text is the caller's responsibility:
run user-visible strings through `t()` before populating the
`CanvasDocument`. This package never displays text on its own.

Resource intensity: a high-DPI PNG of a complex document will allocate a
sizeable raster. For flagship apps with unknown user input, gate the
handler behind a queue / rate limiter rather than calling it inline on
the hot request path.
