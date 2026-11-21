/**
 * Types for the Vue Canvas2D image-editing surface — the same types
 * `@molecule/app-feature-image-canvas-react` exports.
 *
 * @module
 */

/**
 * A two-dimensional offset, in CSS pixels, applied to the rendered image
 * relative to the centre of the canvas. Positive `x` shifts the image
 * right; positive `y` shifts it down.
 */
export interface PanOffset {
  /** Horizontal offset, in CSS pixels. */
  x: number
  /** Vertical offset, in CSS pixels. */
  y: number
}

/**
 * Filter parameters applied to the source image before it is rendered to
 * the canvas. Every field is optional — omitted fields disable that
 * filter. Values are clamped at compose time so out-of-range numbers are
 * safe.
 *
 * Implementation note: composition uses the Canvas2D `filter` property
 * (CSS `<filter-function>` syntax). Compose order is preserved.
 */
export interface ImageCanvasFilters {
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

/**
 * Imperative export handle exposed via `exportRef`. Callers use this to
 * grab the current rendered image (with all filters, zoom, and pan
 * baked in) as a data URL.
 */
export interface ImageCanvasExportHandle {
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

/** ImageCanvas component props (React's prop names). */
export interface ImageCanvasProps {
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
  exportRef?: { current: ImageCanvasExportHandle | null }
  /** Pixel width of the canvas. Defaults to `512`. */
  width?: number
  /** Pixel height of the canvas. Defaults to `512`. */
  height?: number
  /** Extra classes merged onto the root element. */
  className?: string
}
