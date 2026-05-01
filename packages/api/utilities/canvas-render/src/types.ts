/**
 * Public types for `@molecule/api-canvas-render`.
 *
 * A {@link CanvasDocument} is a framework-neutral, JSON-serializable description
 * of a 2D scene — width/height, optional background, and an ordered list of
 * {@link Layer}s. {@link renderCanvasDocument} turns it into a `Buffer` for
 * PNG, SVG, or PDF.
 *
 * @module
 */

/**
 * Supported output formats. Driven by the `format` option on
 * {@link RenderOptions}.
 */
export type CanvasRenderFormat = 'png' | 'svg' | 'pdf'

/**
 * 2D affine transform applied to a layer (and its children, when the layer
 * is a {@link GroupLayer}). Values are in the document's user-space
 * coordinate system. Order is `translate(x, y) → rotate(rotation) → scale(sx, sy)`.
 */
export interface Transform {
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

/**
 * Style fields shared by drawable layers. All colors are CSS-style strings
 * (e.g. `"#1f2937"`, `"rgba(0,0,0,0.5)"`, `"transparent"`).
 */
export interface ShapeStyle {
  /** Fill color. Omit for no fill. */
  fill?: string
  /** Stroke color. Omit for no stroke. */
  stroke?: string
  /** Stroke width in user-space units. Defaults to 1 when `stroke` is set. */
  strokeWidth?: number
}

/**
 * Axis-aligned rectangle, optionally with rounded corners.
 */
export interface RectLayer extends ShapeStyle, Transform {
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

/**
 * Axis-aligned ellipse described by its bounding-box corner + size.
 */
export interface EllipseLayer extends ShapeStyle, Transform {
  kind: 'ellipse'
  x: number
  y: number
  width: number
  height: number
}

/**
 * Single straight line segment.
 */
export interface LineLayer extends ShapeStyle, Transform {
  kind: 'line'
  x1: number
  y1: number
  x2: number
  y2: number
}

/**
 * Arbitrary path described by an SVG-style command string (M/L/C/Q/Z…).
 */
export interface PathLayer extends ShapeStyle, Transform {
  kind: 'path'
  /** SVG path data (`"M0,0 L10,10 Z"`). */
  d: string
}

/**
 * A run of text rendered at a baseline anchor.
 */
export interface TextLayer extends Transform {
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

/**
 * Image element. Source is one of:
 * - `src` — an `http(s):` URL (raster) — only honoured by PNG output.
 * - `data` — a `data:` URI (e.g. `data:image/png;base64,...`).
 * - `buffer` — a raw `Buffer` of PNG/JPEG bytes (encoded to data URI).
 *
 * Exactly one of `src`, `data`, `buffer` must be provided.
 */
export interface ImageLayer extends Transform {
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

/**
 * Group layer — applies its `Transform` to every child, then renders them
 * in array order (later = on top).
 */
export interface GroupLayer extends Transform {
  kind: 'group'
  children: Layer[]
}

/**
 * Discriminated union of every layer kind.
 */
export type Layer =
  | RectLayer
  | EllipseLayer
  | LineLayer
  | PathLayer
  | TextLayer
  | ImageLayer
  | GroupLayer

/**
 * Top-level canvas document consumed by {@link renderCanvasDocument}.
 */
export interface CanvasDocument {
  /** Document width in user-space units (CSS pixels at DPI 1). */
  width: number
  /** Document height in user-space units. */
  height: number
  /** Optional background color (CSS string). Omit for transparent. */
  background?: string
  /** Layers, drawn in array order (later = on top). */
  layers: Layer[]
}

/**
 * Options accepted by {@link renderCanvasDocument}.
 */
export interface RenderOptions {
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

/**
 * Result of {@link renderCanvasDocument}.
 */
export interface RenderResult {
  buffer: Buffer
  /** MIME type of the buffer — `image/png`, `image/svg+xml`, `application/pdf`. */
  contentType: string
  /** Suggested filename extension (no leading dot). */
  extension: 'png' | 'svg' | 'pdf'
}
