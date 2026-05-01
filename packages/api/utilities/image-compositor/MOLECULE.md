# @molecule/api-image-compositor

Multi-layer image composition for molecule.dev.

Takes a {@link LayeredImage} document (the server-side analogue of the
shape consumed by `@molecule/app-feature-image-canvas`) and renders a
single flat PNG/JPEG/WebP buffer.

Decoupled from any concrete image library: at runtime the compositor
looks up the bonded `@molecule/api-image` provider via `bond('image')`
and uses it for raw-buffer decode/encode/resize. There is no direct
`sharp` import in handler-callable code.

## Quick Start

```ts
import { compositeImage } from '@molecule/api-image-compositor'

const png = await compositeImage(
  {
    width: 1200, height: 800,
    background: '#ffffff',
    layers: [
      { kind: 'image', src: backgroundJpg,
        position: { x: 0, y: 0, width: 1200, height: 800 } },
      { kind: 'gradient',
        gradient: { type: 'linear', x0: 0, y0: 0, x1: 0, y1: 1,
          stops: [{ offset: 0, color: 'rgba(0,0,0,0)' },
                  { offset: 1, color: 'rgba(0,0,0,0.6)' }] },
        position: { x: 0, y: 0, width: 1200, height: 800 },
        blendMode: 'multiply' },
    ],
  },
  { format: 'png' },
)
```

```ts
// HTTP handler — Express adapter
import { createImageCompositeHandler } from '@molecule/api-image-compositor'

const handle = createImageCompositeHandler()
router.post('/image/composite', async (req, res, next) => {
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
npm install @molecule/api-image-compositor
```

## API

### Interfaces

#### `CompositeOptions`

Options for {@link compositeImage}.

```typescript
interface CompositeOptions {
  /** Output format. Defaults to `'png'`. */
  format?: CompositeFormat
  /** Output quality (1–100) for lossy formats (`jpeg`, `webp`). Ignored for PNG. */
  quality?: number
  /** Optional final-resize step applied after compositing. */
  resize?: CompositeResize
}
```

#### `CompositeRequest`

Minimal request shape consumed by {@link createImageCompositeHandler}.

```typescript
interface CompositeRequest {
  /** Parsed JSON body — `{ doc, options }` envelope. */
  body: unknown
}
```

#### `CompositeResize`

Output dimensions to resize the flattened result to. Both fields are
optional; if omitted, the document's `width × height` is used as-is.

```typescript
interface CompositeResize {
  /** Target width in pixels. */
  width?: number
  /** Target height in pixels. */
  height?: number
}
```

#### `CompositeResponse`

Minimal response shape consumed by {@link createImageCompositeHandler}.

```typescript
interface CompositeResponse {
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

#### `CompositorDependencies`

Dependencies injected into {@link compositeImage}. All fields are
optional; missing entries are resolved via `bond('image')` at call time.

```typescript
interface CompositorDependencies {
  /** Raster codec for decode/encode/resize. */
  raster?: RasterCodec
}
```

#### `CreateImageCompositeHandlerOptions`

Options for {@link createImageCompositeHandler}.

```typescript
interface CreateImageCompositeHandlerOptions {
  /**
   * Optional pre-flight validator. Throw to reject the request; the thrown
   * error's `.message` becomes the JSON `error` field with HTTP 400.
   */
  validate?: (doc: LayeredImage, options: CompositeOptions) => void | Promise<void>
  /** Default suggested filename (without extension). Defaults to `'composite'`. */
  filename?: string
  /** Optional dependencies forwarded to {@link compositeImage}. */
  deps?: CompositorDependencies
}
```

#### `FillLayer`

Solid fill layer — paints `color` over the layer rect.

```typescript
interface FillLayer extends LayerBase {
  kind: 'fill'
  /** CSS color string (any form `parseCssColor()` accepts). */
  color: string
}
```

#### `GradientLayer`

Gradient layer — paints a linear or radial gradient over the layer rect.

```typescript
interface GradientLayer extends LayerBase {
  kind: 'gradient'
  /** Gradient definition (linear or radial). */
  gradient: Gradient
}
```

#### `GradientStop`

A single linear / radial gradient stop.

```typescript
interface GradientStop {
  /** Position along the gradient axis in `[0, 1]`. */
  offset: number
  /** CSS color string for this stop. */
  color: string
}
```

#### `ImageLayer`

Image layer — `src` is an encoded image buffer (PNG/JPEG/WebP).

```typescript
interface ImageLayer extends LayerBase {
  kind: 'image'
  /** Encoded image buffer to draw. */
  src: Buffer
}
```

#### `LayeredImage`

The full layered-document input to {@link compositeImage}.

```typescript
interface LayeredImage {
  /** Document width in pixels. */
  width: number
  /** Document height in pixels. */
  height: number
  /** Optional CSS color string for the canvas background. Defaults to transparent. */
  background?: string
  /** Layers stacked from background → foreground. */
  layers: Layer[]
}
```

#### `LayerMask`

A single-channel mask buffer applied to the layer.

Pixel `i` in `data` (0..255) scales the corresponding RGBA pixel's alpha
channel by `data[i] / 255`. The buffer must be exactly `width * height`
bytes long.

```typescript
interface LayerMask {
  /** Single-channel grayscale mask (one byte per pixel). */
  data: Buffer
  /** Mask width in pixels. */
  width: number
  /** Mask height in pixels. */
  height: number
}
```

#### `LayerPosition`

Pixel-space position of a layer relative to the document origin
(top-left). Negative values are allowed and the layer is clipped to the
document bounds.

```typescript
interface LayerPosition {
  /** Horizontal offset in pixels from the document's left edge. */
  x: number
  /** Vertical offset in pixels from the document's top edge. */
  y: number
  /** Optional render width in pixels. Defaults to the source asset width. */
  width?: number
  /** Optional render height in pixels. Defaults to the source asset height. */
  height?: number
}
```

#### `LinearGradient`

Linear gradient definition. The gradient axis runs from `(x0, y0)` to
`(x1, y1)` in fractional coordinates of the layer rect (`[0, 1]`).

```typescript
interface LinearGradient {
  type: 'linear'
  x0: number
  y0: number
  x1: number
  y1: number
  stops: GradientStop[]
}
```

#### `RadialGradient`

Radial gradient definition. Center at `(cx, cy)` with radius `r`,
all in fractional coordinates of the layer rect (`[0, 1]`).

```typescript
interface RadialGradient {
  type: 'radial'
  cx: number
  cy: number
  r: number
  stops: GradientStop[]
}
```

#### `RasterCodec`

Minimal raster contract the compositor needs from the bonded image
provider.

The pure-JS layer compositor in {@link compositeRgba} operates on raw
RGBA buffers; this contract supplies the encode/decode round-trip via
the bonded `@molecule/api-image` provider. Bond providers that do not
implement these methods can be wrapped by passing an explicit
{@link CompositorDependencies.raster}.

```typescript
interface RasterCodec {
  /**
   * Decode an encoded image buffer (PNG/JPEG/WebP/etc.) into a raw RGBA
   * pixel buffer.
   *
   * @param buffer - Encoded image bytes.
   */
  decode(buffer: Buffer): Promise<RawImage>

  /**
   * Encode a raw RGBA pixel buffer into the requested image format.
   *
   * @param raw - Source pixels.
   * @param format - Output format.
   * @param quality - Optional quality (1–100) for lossy formats.
   */
  encode(raw: RawImage, format: CompositeFormat, quality?: number): Promise<Buffer>

  /**
   * Resize a raw RGBA buffer to the requested dimensions. Implementations
   * may choose any sensible interpolation; the pure-JS fallback uses
   * nearest-neighbor.
   *
   * @param raw - Source pixels.
   * @param width - Target width.
   * @param height - Target height.
   */
  resizeRaw(raw: RawImage, width: number, height: number): Promise<RawImage>
}
```

#### `RawImage`

Raw RGBA pixel buffer with explicit dimensions. The buffer is always
4 bytes per pixel in `R, G, B, A` order, row-major top-to-bottom.

```typescript
interface RawImage {
  /** RGBA pixel data (`width * height * 4` bytes). */
  data: Buffer
  /** Image width in pixels. */
  width: number
  /** Image height in pixels. */
  height: number
}
```

#### `Rgba`

RGBA color, each channel in `[0, 255]`.

```typescript
interface Rgba {
  r: number
  g: number
  b: number
  a: number
}
```

### Types

#### `BlendMode`

Layer blend modes. Implemented as Porter-Duff "source over" by default
(`'normal'`); the rest follow standard SVG / Canvas2D semantics.

Provider-backed compositors may map these onto their native blend mode
names; the pure-JS fallback implements them in `applyBlendMode()`.

```typescript
type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay'
```

#### `CompositeFormat`

Supported output formats for the flattened image.

```typescript
type CompositeFormat = 'png' | 'jpeg' | 'webp'
```

#### `Gradient`

Union of supported gradient kinds.

```typescript
type Gradient = LinearGradient | RadialGradient
```

#### `Layer`

Discriminated union of all layer types.

```typescript
type Layer = ImageLayer | FillLayer | GradientLayer
```

#### `LayerKind`

Discriminated union of layer kinds the compositor understands.

```typescript
type LayerKind = 'image' | 'fill' | 'gradient'
```

### Functions

#### `blendChannel(mode, s, d)`

Blend the source channel `s` over the destination channel `d` per the
named blend mode. All inputs and outputs are 0–255 bytes.

```typescript
function blendChannel(mode: BlendMode, s: number, d: number): number
```

- `mode` — Blend mode.
- `s` — Source channel (0–255).
- `d` — Destination channel (0–255).

**Returns:** Blended channel value.

#### `clamp(value, lo, hi)`

Clamp a number into `[lo, hi]`.

```typescript
function clamp(value: number, lo: number, hi: number): number
```

- `value` — Input value.
- `lo` — Lower bound (inclusive).
- `hi` — Upper bound (inclusive).

#### `composePixel(mode, srcOpacity, dst, dstOffset, src, srcOffset)`

Compose a single source pixel onto a single destination pixel using the
named blend mode + Porter-Duff source-over alpha compositing.

Mutates `dst` in place at offset `dstOffset` and reads `src` at
`srcOffset`.

```typescript
function composePixel(mode: BlendMode, srcOpacity: number, dst: Buffer<ArrayBufferLike>, dstOffset: number, src: Buffer<ArrayBufferLike>, srcOffset: number): void
```

- `mode` — Blend mode for the RGB channels.
- `srcOpacity` — Per-layer opacity multiplier in `[0, 1]`.
- `dst` — Destination buffer.
- `dstOffset` — Byte offset within `dst`.
- `src` — Source buffer.
- `srcOffset` — Byte offset within `src`.

#### `compositeImage(doc, options, deps)`

Flatten a layered image document into an encoded image buffer.

Stages:
1. Compose every layer into a flat RGBA raster (`compositeRgba`).
2. Optionally resize the flat raster (`raster.resizeRaw`).
3. Encode the result in the requested output format (`raster.encode`).

```typescript
function compositeImage(doc: LayeredImage, options?: CompositeOptions, deps?: CompositorDependencies): Promise<Buffer<ArrayBufferLike>>
```

- `doc` — Layered-image document.
- `options` — Output format / quality / optional resize.
- `deps` — Optional dependency injection. When omitted, the bonded

**Returns:** The flattened, encoded image buffer.

#### `compositeRgba(doc, raster)`

Composite a layered document into a flat RGBA raster, in memory.

```typescript
function compositeRgba(doc: LayeredImage, raster: RasterCodec): Promise<RawImage>
```

- `doc` — Layered-image document.
- `raster` — Codec used to decode encoded `image` layer buffers.

**Returns:** The flat RGBA raster sized to the document bounds.

#### `contentTypeForFormat(format)`

Map an output format to a `Content-Type` header value.

```typescript
function contentTypeForFormat(format: CompositeFormat): string
```

- `format` — Composite output format.

#### `createImageCompositeHandler(handlerOptions)`

Build a `(req, res) => Promise<void>` handler that invokes
{@link compositeImage} and streams the resulting buffer back.

```typescript
function createImageCompositeHandler(handlerOptions?: CreateImageCompositeHandlerOptions): (req: CompositeRequest, res: CompositeResponse) => Promise<void>
```

- `handlerOptions` — Optional validator / filename / deps.

**Returns:** An async handler accepting `{ body }` and a response shim.

#### `extensionForFormat(format)`

Map an output format to a file extension (without leading dot).

```typescript
function extensionForFormat(format: CompositeFormat): string
```

- `format` — Composite output format.

#### `getRasterCodec()`

Resolve the {@link RasterCodec} from the bonded `@molecule/api-image`
provider.

```typescript
function getRasterCodec(): RasterCodec
```

**Returns:** The bonded provider cast to a raster codec, if it implements
 *   the required methods.

#### `isRasterCodec(value)`

Type guard for {@link RasterCodec}.

```typescript
function isRasterCodec(value: unknown): boolean
```

- `value` — Candidate provider.

**Returns:** `true` when `value` looks like a {@link RasterCodec}.

#### `lerpRgba(a, b, t)`

Linearly interpolate two RGBA colors at fraction `t` in `[0, 1]`.

```typescript
function lerpRgba(a: Rgba, b: Rgba, t: number): Rgba
```

- `a` — Start color.
- `b` — End color.
- `t` — Interpolation fraction.

#### `parseCssColor(input)`

Parse a CSS color string into RGBA bytes.

```typescript
function parseCssColor(input: string): Rgba | null
```

- `input` — CSS color string.

**Returns:** Parsed RGBA, or `null` if the string is unrecognized.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-image` ^1.0.0
- `@molecule/api-image-sharp` ^1.0.0

Resource intensity: a high-resolution layered document with many
blended layers will allocate sizeable RGBA buffers (4 bytes per pixel,
per layer at peak). For flagship apps with unrestricted user input,
gate the handler behind a queue or rate limiter rather than calling it
inline on the hot request path.
