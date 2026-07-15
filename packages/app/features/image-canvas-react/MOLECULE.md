# @molecule/app-feature-image-canvas-react

Image canvas — Canvas2D image-editing surface with a CSS filter chain
(brightness, contrast, saturation, hue, sepia, grayscale, blur,
sharpen), pointer-event drag panning, wheel zooming, and a data-URL
export handle.

Used by the photo-editor flagship as the workspace surface for the
editing pipeline. The component owns no editor-state — callers pass
`filters`, `zoom`, and `pan` and listen on `onChange` for user-driven
pan / zoom updates. `exportRef.current.toDataURL()` snapshots the
current rendered image for "save" / "export" actions.

## Quick Start

```tsx
import { ImageCanvas, type ImageCanvasExportHandle } from '@molecule/app-feature-image-canvas-react'

function Editor() {
  const exportRef = useRef<ImageCanvasExportHandle>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  return (
    <>
      <ImageCanvas
        src="/photo.jpg"
        filters={{ brightness: 1.1, contrast: 1.2, sepia: 0.3 }}
        zoom={zoom}
        pan={pan}
        onChange={({ zoom, pan }) => { setZoom(zoom); setPan(pan) }}
        exportRef={exportRef}
      />
      <button onClick={() => download(exportRef.current?.toDataURL('image/jpeg', 0.92))}>
        Save
      </button>
    </>
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-feature-image-canvas-react @molecule/app-react @molecule/app-ui react
npm install -D @types/react
```

## API

### Interfaces

#### `ImageCanvasExportHandle`

Imperative export handle exposed via `exportRef`. Callers use this to
grab the current rendered image (with all filters, zoom, and pan
baked in) as a data URL.

```typescript
interface ImageCanvasExportHandle {
  /**
   * Snapshot the current canvas as a data URL.
   *
   * @param type - Image MIME type. Defaults to `image/png`.
   * @param quality - Lossy quality in `[0, 1]` for `image/jpeg` /
   *   `image/webp`. Ignored for `image/png`.
   * @returns A data URL string, or an empty string if the canvas is not
   *   yet mounted.
   */
  toDataURL: (type?: string, quality?: number) => string
}
```

#### `ImageCanvasFilters`

Filter parameters applied to the source image before it is rendered to
the canvas. Every field is optional — omitted fields disable that
filter. Values are clamped at compose time so out-of-range numbers are
safe.

Implementation note: composition uses the Canvas2D `filter` property
(CSS `<filter-function>` syntax). Compose order is preserved.

```typescript
interface ImageCanvasFilters {
  /**
   * Brightness multiplier. `1` is identity, `0` is black, `2` is twice
   * as bright. Values < 0 are clamped to 0.
   */
  brightness?: number
  /**
   * Contrast multiplier. `1` is identity, `0` is fully grey, `2` is
   * twice the contrast. Values < 0 are clamped to 0.
   */
  contrast?: number
  /**
   * Saturation multiplier. `1` is identity, `0` is grayscale, `2` is
   * twice as saturated. Values < 0 are clamped to 0.
   */
  saturation?: number
  /**
   * Hue rotation in degrees. Normalised modulo 360 — any finite value
   * is accepted.
   */
  hue?: number
  /**
   * Sepia amount in `[0, 1]`. `0` disables; `1` applies fully. Values
   * outside the range are clamped.
   */
  sepia?: number
  /**
   * Grayscale amount in `[0, 1]`. `0` disables; `1` applies fully.
   * Values outside the range are clamped.
   */
  grayscale?: number
  /**
   * Gaussian blur radius in CSS pixels. `0` disables. Negative values
   * are clamped to 0.
   */
  blur?: number
  /**
   * Sharpen strength in `[0, 1]`. Approximated as a negative-blur
   * contrast bump using the CSS `contrast()` filter; `0` disables.
   * Values outside the range are clamped.
   */
  sharpen?: number
}
```

#### `ImageCanvasProps`

ImageCanvas component props.

```typescript
interface ImageCanvasProps {
  /**
   * Image source. Either a string (URL or data URL) — which the
   * component loads into an internal `HTMLImageElement` — or an
   * already-loaded `HTMLImageElement` the caller manages.
   */
  src: string | HTMLImageElement
  /** Filter chain applied to the rendered image. */
  filters?: ImageCanvasFilters
  /**
   * Zoom factor. `1` is identity. Values <= 0 fall back to `1`.
   * Defaults to `1`.
   */
  zoom?: number
  /**
   * Pan offset in CSS pixels relative to the centre of the canvas.
   * Defaults to `{ x: 0, y: 0 }`.
   */
  pan?: PanOffset
  /**
   * Optional callback fired when the user pans or zooms the canvas.
   * Use this for controlled-component patterns.
   */
  onChange?: (next: { zoom: number; pan: PanOffset }) => void
  /**
   * Imperative handle exposing `toDataURL()` for the caller to grab
   * the rendered result.
   */
  exportRef?: React.Ref<ImageCanvasExportHandle>
  /** Pixel width of the canvas. Defaults to `512`. */
  width?: number
  /** Pixel height of the canvas. Defaults to `512`. */
  height?: number
  /** Extra classes merged onto the root element. */
  className?: string
}
```

#### `PanOffset`

A two-dimensional offset, in CSS pixels, applied to the rendered image
relative to the centre of the canvas. Positive `x` shifts the image
right; positive `y` shifts it down.

```typescript
interface PanOffset {
  /** Horizontal offset, in CSS pixels. */
  x: number
  /** Vertical offset, in CSS pixels. */
  y: number
}
```

### Functions

#### `clamp(value, min, max)`

Clamp a numeric value into the closed interval `[min, max]`. Returns
`min` for non-finite inputs.

```typescript
function clamp(value: number, min: number, max: number): number
```

- `value` — The value to clamp.
- `min` — Inclusive minimum.
- `max` — Inclusive maximum.

**Returns:** The clamped value.

#### `clampPan(pan, canvasSize, imageSize, zoom)`

Clamp a pan offset so the (zoomed) image cannot be dragged entirely
off-canvas. The clamp keeps at least half of the image visible in
each axis. Non-finite inputs are treated as `0`.

```typescript
function clampPan(pan: PanOffset, canvasSize: { width: number; height: number; }, imageSize: { width: number; height: number; }, zoom: number): PanOffset
```

- `pan` — The desired pan offset, in CSS pixels.
- `canvasSize` — The canvas size in CSS pixels.
- `imageSize` — The source image's natural size in pixels.
- `zoom` — The current zoom factor. Non-positive values fall back

**Returns:** The clamped pan offset.

#### `composeFilterString(filters)`

Compose a CSS filter string from a set of `ImageCanvasFilters` values.
Out-of-range values are clamped; omitted / non-finite fields are
ignored. Returns `'none'` when no filters are active so callers can
assign the result directly to `CanvasRenderingContext2D.filter`.

```typescript
function composeFilterString(filters?: ImageCanvasFilters): string
```

- `filters` — The filter parameters. May be `undefined`.

**Returns:** A CSS filter string, or `'none'` when nothing applies.

#### `screenToCanvas(point, canvasSize, imageSize, zoom, pan)`

Convert a screen-space (canvas-relative) point into image-space
coordinates given the current zoom + pan and the source image
dimensions. Useful for tools that need to know which image pixel a
pointer event hit (cropping, picking, masking).

```typescript
function screenToCanvas(point: { x: number; y: number; }, canvasSize: { width: number; height: number; }, imageSize: { width: number; height: number; }, zoom: number, pan: PanOffset): { x: number; y: number; }
```

- `point` — The canvas-space point in CSS pixels (origin top-left
- `canvasSize` — The canvas size in CSS pixels.
- `imageSize` — The source image's natural size in pixels.
- `zoom` — The current zoom factor. Non-positive values fall back
- `pan` — The current pan offset in CSS pixels.

**Returns:** The corresponding point in image-space coordinates.

### Constants

#### `ImageCanvas`

Canvas2D image-editing surface. Renders a source image onto a canvas
with a filter chain (brightness, contrast, saturation, hue, sepia,
grayscale, blur, sharpen), pointer-event drag panning, and wheel
zooming. The current state can be exported to a data URL via the
`exportRef` imperative handle.

All styling routes through `getClassMap()` (no Tailwind / raw class
names). All user-visible text routes through `t()` so the canvas
translates via the companion
`@molecule/app-locales-feature-image-canvas` locale bond.

```typescript
const ImageCanvas: ForwardRefExoticComponent<ImageCanvasProps & RefAttributes<ImageCanvasExportHandle>>
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

Translation strings are provided by `@molecule/app-locales-feature-image-canvas`.
