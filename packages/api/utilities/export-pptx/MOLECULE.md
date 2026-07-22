# @molecule/api-export-pptx

Pure-function PPTX export for molecule.dev. Takes a JSON-serializable
`Deck` (slides + elements) and produces a `.pptx` `Buffer` — a ZIP of
OOXML parts that opens cleanly in PowerPoint, Keynote, and Google
Slides.

## Quick Start

```ts
import { exportPptx } from '@molecule/api-export-pptx'

const result = await exportPptx({
  title: 'Q1 Update',
  author: 'Acme Inc.',
  slides: [
    {
      background: '#ffffff',
      elements: [
        { kind: 'text', x: 0.5, y: 0.5, w: 9, h: 1,
          body: 'Welcome', fontSize: 36, bold: true },
        { kind: 'shape', shape: 'rect', x: 0.5, y: 2, w: 4, h: 0.05,
          fill: '#3b82f6' },
      ],
    },
  ],
})

// Node: write to disk
import { writeFile } from 'node:fs/promises'
await writeFile(result.filename, result.buffer)
```

```ts
// HTTP handler — Express adapter
import { createPptxExportHandler } from '@molecule/api-export-pptx'

const handle = createPptxExportHandler()
router.post('/export/pptx', async (req, res, next) => {
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
npm install @molecule/api-export-pptx pptxgenjs
```

## API

### Interfaces

#### `Box`

A position + size, expressed in inches (the native PPTX unit).

`x`, `y` are the top-left corner, `w`, `h` the width and height. All values
are in inches; a standard 16:9 slide is 13.333 × 7.5 in.

```typescript
interface Box {
  x: number
  y: number
  w: number
  h: number
}
```

#### `ChartDataPoint`

A single (label, value) pair in a chart series.

```typescript
interface ChartDataPoint {
  label: string
  value: number
}
```

#### `ChartElement`

A chart element.

```typescript
interface ChartElement extends Box {
  kind: 'chart'
  chart: ChartKind
  /** One or more named series. `pie` charts read only `series[0]`. */
  series: ChartSeries[]
  /** Optional chart title rendered inside the chart frame. */
  title?: string
  /** Show legend. Defaults to `true` when `series.length > 1`. */
  showLegend?: boolean
}
```

#### `ChartSeries`

One labelled data series. `pie` charts use only the first series.

```typescript
interface ChartSeries {
  /** Series name shown in the legend. */
  name: string
  data: ChartDataPoint[]
}
```

#### `CreatePptxExportHandlerOptions`

Options for {@link createPptxExportHandler}.

```typescript
interface CreatePptxExportHandlerOptions {
  /**
   * Optional pre-flight validator. Throw to reject the request; the thrown
   * error's `.message` becomes the JSON `error` field with HTTP 400.
   * Use this to enforce app-specific size/auth/quota rules.
   */
  validate?: (deck: Deck, options: ExportPptxOptions) => void | Promise<void>
}
```

#### `Deck`

The top-level deck definition consumed by {@link exportPptx}.

```typescript
interface Deck {
  /** Deck title (also written into core OOXML metadata). */
  title?: string
  /** Author name (written into core OOXML metadata). */
  author?: string
  /** Subject / category (written into core OOXML metadata). */
  subject?: string
  /** Company name (written into core OOXML metadata). */
  company?: string
  /** Slides in display order. */
  slides: Slide[]
}
```

#### `ExportPptxOptions`

Options accepted by {@link exportPptx}.

```typescript
interface ExportPptxOptions {
  /**
   * Override the suggested filename written into `Content-Disposition` by the
   * HTTP handler. Has no effect on the buffer itself. Defaults to
   * `deck.title || 'deck'`, sanitized.
   */
  filename?: string
}
```

#### `ExportPptxResult`

Result of {@link exportPptx}: the binary buffer plus the suggested
filename (without extension is fine — `.pptx` is appended if missing).

```typescript
interface ExportPptxResult {
  buffer: Buffer
  filename: string
  contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
}
```

#### `ImageElement`

An image element. Source is one of:
- `src` — an `http(s):` URL or `file:` path resolvable by pptxgenjs
- `data` — a `data:` URI (e.g. `data:image/png;base64,...`)
- `buffer` — a raw `Buffer` of PNG/JPEG/GIF bytes (encoded to data URI)

Exactly one of `src`, `data`, `buffer` must be provided.

```typescript
interface ImageElement extends Box {
  kind: 'image'
  src?: string
  data?: string
  buffer?: Buffer
  /** MIME type when supplying `buffer`. Defaults to `image/png`. */
  mimeType?: string
  /** Alt text for accessibility. */
  altText?: string
}
```

#### `PptxRequest`

Minimal request shape consumed by {@link createPptxExportHandler}. The
adapter is responsible for parsing JSON before calling — most frameworks
already have body-parser middleware that does this.

```typescript
interface PptxRequest {
  /** Parsed JSON body — expected shape is `Deck` (optionally `{ deck, options }`). */
  body: unknown
}
```

#### `PptxResponse`

Minimal response shape consumed by {@link createPptxExportHandler}. The
adapter forwards calls to the underlying framework's response object.

```typescript
interface PptxResponse {
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

#### `ShapeElement`

A geometric shape element.

```typescript
interface ShapeElement extends Box {
  kind: 'shape'
  shape: ShapeKind
  /** Hex fill color. Omit for no fill. */
  fill?: string
  /** Hex line color. Omit for no border. */
  line?: string
  /** Line width in points. Defaults to 1. */
  lineWidth?: number
  /** Corner radius (0..1) for `roundedRect`. */
  rectRadius?: number
}
```

#### `Slide`

A single slide.

```typescript
interface Slide {
  /** Layout hint — see {@link SlideLayout}. */
  layout?: SlideLayout
  /** Hex background color (`"#ffffff"`). Defaults to white. */
  background?: string
  /** Renderable elements, drawn in array order (later = on top). */
  elements: SlideElement[]
  /** Optional speaker notes. */
  notes?: string
}
```

#### `TextElement`

A text element rendered into a positioned text box on the slide.

```typescript
interface TextElement extends Box, TextStyle {
  kind: 'text'
  /** Plain-text body. Newlines (`\n`) become paragraph breaks. */
  body: string
}
```

#### `TextStyle`

Text run / paragraph styling shared by `text` elements and the title /
value labels of `chart` elements.

```typescript
interface TextStyle {
  /** Font family (e.g. `"Inter"`, `"Arial"`). Defaults to the slide master font. */
  fontFace?: string

  /** Font size in points. Defaults to 18. */
  fontSize?: number

  /** Hex color string (`"#1f2937"` or `"1f2937"`). Defaults to `#000000`. */
  color?: string

  /** Bold weight. Defaults to `false`. */
  bold?: boolean

  /** Italic style. Defaults to `false`. */
  italic?: boolean

  /** Underline. Defaults to `false`. */
  underline?: boolean

  /** Horizontal alignment. Defaults to `"left"`. */
  align?: TextAlignment

  /** Vertical alignment within the text box. Defaults to `"top"`. */
  valign?: VerticalAlignment
}
```

### Types

#### `ChartKind`

Chart kinds supported by the `chart` element kind.

```typescript
type ChartKind = 'bar' | 'line' | 'pie'
```

#### `ShapeKind`

Geometric shape primitives supported by the `shape` element kind.

```typescript
type ShapeKind = 'rect' | 'roundedRect' | 'ellipse' | 'line'
```

#### `SlideElement`

Discriminated union of all element kinds renderable on a slide.

```typescript
type SlideElement = TextElement | ImageElement | ShapeElement | ChartElement
```

#### `SlideLayout`

Layout hints for a slide. `widescreen` is the default (16:9, 13.333×7.5 in).
`standard` is 4:3 (10×7.5 in). The chosen layout applies to the whole deck;
if slides specify conflicting layouts, the first one wins.

```typescript
type SlideLayout = 'widescreen' | 'standard'
```

#### `TextAlignment`

Horizontal text alignment within a text box.

```typescript
type TextAlignment = 'left' | 'center' | 'right' | 'justify'
```

#### `VerticalAlignment`

Vertical text alignment within a text box.

```typescript
type VerticalAlignment = 'top' | 'middle' | 'bottom'
```

### Functions

#### `createPptxExportHandler(handlerOptions)`

Build a `(req, res) => Promise<void>` handler that:

1. Reads `req.body` (a parsed `Deck`, or `{ deck, options }`).
2. Calls {@link exportPptx} to produce the `.pptx` buffer.
3. Writes `Content-Type`, `Content-Disposition: attachment`, and
   `Content-Length` headers.
4. Streams the buffer back as the response body.

```typescript
function createPptxExportHandler(handlerOptions?: CreatePptxExportHandlerOptions): (req: PptxRequest, res: PptxResponse) => Promise<void>
```

- `handlerOptions` — Optional pre-flight validator.

**Returns:** An async handler accepting {@link PptxRequest} + {@link PptxResponse}.

#### `exportPptx(deck, options)`

Serialize a {@link Deck} into a `.pptx` `Buffer`.

```typescript
function exportPptx(deck: Deck, options?: ExportPptxOptions): Promise<ExportPptxResult>
```

- `deck` — The deck description (slides + metadata).
- `options` — Optional export tweaks (e.g. filename override).

**Returns:** A {@link ExportPptxResult} with the buffer, suggested filename, and the canonical PPTX MIME type.

#### `sanitizeFilename(name)`

Sanitize a string for use as a filename (no path separators, no control
characters). Always returns a non-empty string ending in `.pptx`.

```typescript
function sanitizeFilename(name: string): string
```

### Constants

#### `PPTX_CONTENT_TYPE`

```typescript
const PPTX_CONTENT_TYPE: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
```

## Injection Notes

### Runtime Dependencies

- `pptxgenjs`

The serializer is a pure function — no fetch, no state, no global
config. Locale text is the caller's responsibility (run user-visible
strings through `t()` before populating the `Deck`); this package
never displays text on its own.
