/**
 * Type definitions for `@molecule/api-image-compositor`.
 *
 * A `LayeredImage` is the server-side analogue of the document shape used by
 * `@molecule/app-feature-image-canvas`: a flat list of layers stacked from
 * background → foreground. `compositeImage` flattens the document into a
 * single PNG/JPEG/WebP buffer.
 *
 * @module
 */

/**
 * Supported output formats for the flattened image.
 */
export type CompositeFormat = 'png' | 'jpeg' | 'webp'

/**
 * Layer blend modes. Implemented as Porter-Duff "source over" by default
 * (`'normal'`); the rest follow standard SVG / Canvas2D semantics.
 *
 * Provider-backed compositors may map these onto their native blend mode
 * names; the pure-JS fallback implements them in `applyBlendMode()`.
 */
export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay'

/**
 * Pixel-space position of a layer relative to the document origin
 * (top-left). Negative values are allowed and the layer is clipped to the
 * document bounds.
 */
export interface LayerPosition {
  /** Horizontal offset in pixels from the document's left edge. */
  x: number
  /** Vertical offset in pixels from the document's top edge. */
  y: number
  /** Optional render width in pixels. Defaults to the source asset width. */
  width?: number
  /** Optional render height in pixels. Defaults to the source asset height. */
  height?: number
}

/**
 * A single linear / radial gradient stop.
 */
export interface GradientStop {
  /** Position along the gradient axis in `[0, 1]`. */
  offset: number
  /** CSS color string for this stop. */
  color: string
}

/**
 * Linear gradient definition. The gradient axis runs from `(x0, y0)` to
 * `(x1, y1)` in fractional coordinates of the layer rect (`[0, 1]`).
 */
export interface LinearGradient {
  type: 'linear'
  x0: number
  y0: number
  x1: number
  y1: number
  stops: GradientStop[]
}

/**
 * Radial gradient definition. Center at `(cx, cy)` with radius `r`,
 * all in fractional coordinates of the layer rect (`[0, 1]`).
 */
export interface RadialGradient {
  type: 'radial'
  cx: number
  cy: number
  r: number
  stops: GradientStop[]
}

/**
 * Union of supported gradient kinds.
 */
export type Gradient = LinearGradient | RadialGradient

/**
 * A single-channel mask buffer applied to the layer.
 *
 * Pixel `i` in `data` (0..255) scales the corresponding RGBA pixel's alpha
 * channel by `data[i] / 255`. The buffer must be exactly `width * height`
 * bytes long.
 */
export interface LayerMask {
  /** Single-channel grayscale mask (one byte per pixel). */
  data: Buffer
  /** Mask width in pixels. */
  width: number
  /** Mask height in pixels. */
  height: number
}

/**
 * Discriminated union of layer kinds the compositor understands.
 */
export type LayerKind = 'image' | 'fill' | 'gradient'

/**
 * Common properties for all layers.
 */
interface LayerBase {
  /** Kind of layer (drives the `src` / `color` / `gradient` field). */
  kind: LayerKind
  /** Pixel-space position of the layer. */
  position: LayerPosition
  /** Layer opacity in `[0, 1]`. Defaults to `1`. */
  opacity?: number
  /** Blend mode for this layer over the underlying composite. Defaults to `'normal'`. */
  blendMode?: BlendMode
  /** Optional alpha mask applied to the layer before blending. */
  mask?: LayerMask
}

/**
 * Image layer — `src` is an encoded image buffer (PNG/JPEG/WebP).
 */
export interface ImageLayer extends LayerBase {
  kind: 'image'
  /** Encoded image buffer to draw. */
  src: Buffer
}

/**
 * Solid fill layer — paints `color` over the layer rect.
 */
export interface FillLayer extends LayerBase {
  kind: 'fill'
  /** CSS color string (any form `parseCssColor()` accepts). */
  color: string
}

/**
 * Gradient layer — paints a linear or radial gradient over the layer rect.
 */
export interface GradientLayer extends LayerBase {
  kind: 'gradient'
  /** Gradient definition (linear or radial). */
  gradient: Gradient
}

/**
 * Discriminated union of all layer types.
 */
export type Layer = ImageLayer | FillLayer | GradientLayer

/**
 * The full layered-document input to {@link compositeImage}.
 */
export interface LayeredImage {
  /** Document width in pixels. */
  width: number
  /** Document height in pixels. */
  height: number
  /** Optional CSS color string for the canvas background. Defaults to transparent. */
  background?: string
  /** Layers stacked from background → foreground. */
  layers: Layer[]
}

/**
 * Output dimensions to resize the flattened result to. Both fields are
 * optional; if omitted, the document's `width × height` is used as-is.
 */
export interface CompositeResize {
  /** Target width in pixels. */
  width?: number
  /** Target height in pixels. */
  height?: number
}

/**
 * Options for {@link compositeImage}.
 */
export interface CompositeOptions {
  /** Output format. Defaults to `'png'`. */
  format?: CompositeFormat
  /** Output quality (1–100) for lossy formats (`jpeg`, `webp`). Ignored for PNG. */
  quality?: number
  /** Optional final-resize step applied after compositing. */
  resize?: CompositeResize
}

/**
 * Raw RGBA pixel buffer with explicit dimensions. The buffer is always
 * 4 bytes per pixel in `R, G, B, A` order, row-major top-to-bottom.
 */
export interface RawImage {
  /** RGBA pixel data (`width * height * 4` bytes). */
  data: Buffer
  /** Image width in pixels. */
  width: number
  /** Image height in pixels. */
  height: number
}

/**
 * Minimal raster contract the compositor needs from the bonded image
 * provider.
 *
 * The pure-JS layer compositor in {@link compositeRgba} operates on raw
 * RGBA buffers; this contract supplies the encode/decode round-trip via
 * the bonded `@molecule/api-image` provider. Bond providers that do not
 * implement these methods can be wrapped by passing an explicit
 * {@link CompositorDependencies.raster}.
 */
export interface RasterCodec {
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

/**
 * Dependencies injected into {@link compositeImage}. All fields are
 * optional; missing entries are resolved via `bond('image')` at call time.
 */
export interface CompositorDependencies {
  /** Raster codec for decode/encode/resize. */
  raster?: RasterCodec
}
