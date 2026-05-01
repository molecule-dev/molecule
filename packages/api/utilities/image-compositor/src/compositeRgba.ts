/**
 * Pure-JS layered-image compositor that operates on raw RGBA buffers.
 *
 * No native dependencies — all blending/positioning/masking happens in
 * portable TypeScript. Encoded image inputs (PNG/JPEG/WebP) are decoded
 * to raw RGBA via the injected {@link RasterCodec}; the final flat
 * raster is encoded back via the same codec.
 *
 * @module
 */

import { composePixel } from './blend.js'
import { clamp, lerpRgba, parseCssColor, type Rgba } from './color.js'
import type {
  BlendMode,
  FillLayer,
  Gradient,
  GradientLayer,
  ImageLayer,
  Layer,
  LayerMask,
  LayerPosition,
  LayeredImage,
  RasterCodec,
  RawImage,
} from './types.js'

/**
 * Composite a layered document into a flat RGBA raster, in memory.
 *
 * @param doc - Layered-image document.
 * @param raster - Codec used to decode encoded `image` layer buffers.
 * @returns The flat RGBA raster sized to the document bounds.
 */
export async function compositeRgba(doc: LayeredImage, raster: RasterCodec): Promise<RawImage> {
  if (!Number.isInteger(doc.width) || doc.width <= 0) {
    throw new Error('LayeredImage.width must be a positive integer')
  }
  if (!Number.isInteger(doc.height) || doc.height <= 0) {
    throw new Error('LayeredImage.height must be a positive integer')
  }

  const base: RawImage = {
    data: Buffer.alloc(doc.width * doc.height * 4),
    width: doc.width,
    height: doc.height,
  }
  if (doc.background) {
    fillRect(base, parseCssColor(doc.background) ?? { r: 0, g: 0, b: 0, a: 0 }, {
      x: 0,
      y: 0,
      width: doc.width,
      height: doc.height,
    })
  }

  for (const layer of doc.layers) {
    const layerRaster = await rasterizeLayer(layer, raster)
    if (!layerRaster) continue
    if (layer.mask) {
      applyMask(layerRaster, layer.mask)
    }
    paintLayer(base, layerRaster, layer)
  }

  return base
}

/**
 * Rasterize a single layer into a layer-rect-sized RGBA buffer (already
 * positioned at `layer.position.x/y` of the document — the `paintLayer`
 * step composites it onto the base).
 *
 * Returns `null` when the layer has zero size or unrenderable inputs.
 *
 * @param layer - Layer definition.
 * @param raster - Codec for decoding/resizing image layers.
 */
async function rasterizeLayer(layer: Layer, raster: RasterCodec): Promise<RawImage | null> {
  switch (layer.kind) {
    case 'image':
      return rasterizeImageLayer(layer, raster)
    case 'fill':
      return rasterizeFillLayer(layer)
    case 'gradient':
      return rasterizeGradientLayer(layer)
  }
}

/**
 * Decode an `image` layer to RGBA and resize it to the layer rect.
 *
 * @param layer - Image layer.
 * @param raster - Codec for decode + resize.
 */
async function rasterizeImageLayer(
  layer: ImageLayer,
  raster: RasterCodec,
): Promise<RawImage | null> {
  const decoded = await raster.decode(layer.src)
  const targetWidth = layer.position.width ?? decoded.width
  const targetHeight = layer.position.height ?? decoded.height
  if (targetWidth <= 0 || targetHeight <= 0) return null
  if (targetWidth === decoded.width && targetHeight === decoded.height) {
    return decoded
  }
  return raster.resizeRaw(decoded, targetWidth, targetHeight)
}

/**
 * Rasterize a solid `fill` layer.
 *
 * @param layer - Fill layer.
 */
function rasterizeFillLayer(layer: FillLayer): RawImage | null {
  const { width, height } = effectiveLayerSize(layer.position)
  if (width <= 0 || height <= 0) return null
  const out: RawImage = {
    data: Buffer.alloc(width * height * 4),
    width,
    height,
  }
  fillRect(out, parseCssColor(layer.color) ?? { r: 0, g: 0, b: 0, a: 0 }, {
    x: 0,
    y: 0,
    width,
    height,
  })
  return out
}

/**
 * Rasterize a `gradient` layer.
 *
 * @param layer - Gradient layer.
 */
function rasterizeGradientLayer(layer: GradientLayer): RawImage | null {
  const { width, height } = effectiveLayerSize(layer.position)
  if (width <= 0 || height <= 0) return null
  const out: RawImage = {
    data: Buffer.alloc(width * height * 4),
    width,
    height,
  }
  paintGradient(out, layer.gradient)
  return out
}

/**
 * Resolve the layer's render size, defaulting `width`/`height` to 0 when
 * unset (image layers without explicit size are sized from the decoded
 * source by `rasterizeImageLayer`).
 *
 * @param position - Layer position.
 */
function effectiveLayerSize(position: LayerPosition): { width: number; height: number } {
  return {
    width: Math.max(0, Math.floor(position.width ?? 0)),
    height: Math.max(0, Math.floor(position.height ?? 0)),
  }
}

/**
 * Paint a gradient into a freshly-allocated RGBA buffer.
 *
 * @param out - Destination buffer.
 * @param gradient - Gradient definition.
 */
function paintGradient(out: RawImage, gradient: Gradient): void {
  const stops = [...gradient.stops].sort((a, b) => a.offset - b.offset)
  if (stops.length === 0) return
  const parsed = stops.map((s) => ({
    offset: clamp(s.offset, 0, 1),
    color: parseCssColor(s.color) ?? { r: 0, g: 0, b: 0, a: 0 },
  }))

  for (let y = 0; y < out.height; y++) {
    for (let x = 0; x < out.width; x++) {
      const t = sampleGradient(gradient, x, y, out.width, out.height)
      const color = colorAtOffset(parsed, t)
      const off = (y * out.width + x) * 4
      out.data[off] = color.r
      out.data[off + 1] = color.g
      out.data[off + 2] = color.b
      out.data[off + 3] = color.a
    }
  }
}

/**
 * Compute the gradient parameter `t` at integer pixel `(x, y)`.
 *
 * @param gradient - Gradient definition.
 * @param x - Pixel x.
 * @param y - Pixel y.
 * @param width - Layer width.
 * @param height - Layer height.
 */
function sampleGradient(
  gradient: Gradient,
  x: number,
  y: number,
  width: number,
  height: number,
): number {
  if (gradient.type === 'linear') {
    const x0 = gradient.x0 * width
    const y0 = gradient.y0 * height
    const x1 = gradient.x1 * width
    const y1 = gradient.y1 * height
    const dx = x1 - x0
    const dy = y1 - y0
    const len2 = dx * dx + dy * dy
    if (len2 === 0) return 0
    const px = x - x0
    const py = y - y0
    return clamp((px * dx + py * dy) / len2, 0, 1)
  }
  // radial
  const cx = gradient.cx * width
  const cy = gradient.cy * height
  const r = gradient.r * Math.max(width, height)
  if (r <= 0) return 1
  const dx = x - cx
  const dy = y - cy
  return clamp(Math.sqrt(dx * dx + dy * dy) / r, 0, 1)
}

/**
 * Look up the gradient color at parameter `t` by linear interpolation
 * between the surrounding stops.
 *
 * @param stops - Pre-sorted stops with parsed RGBA colors.
 * @param t - Gradient parameter in `[0, 1]`.
 */
function colorAtOffset(stops: Array<{ offset: number; color: Rgba }>, t: number): Rgba {
  if (stops.length === 1) return stops[0]!.color
  if (t <= stops[0]!.offset) return stops[0]!.color
  if (t >= stops[stops.length - 1]!.offset) return stops[stops.length - 1]!.color
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i]!
    const b = stops[i + 1]!
    if (t >= a.offset && t <= b.offset) {
      const span = b.offset - a.offset || 1
      const k = (t - a.offset) / span
      return lerpRgba(a.color, b.color, k)
    }
  }
  return stops[stops.length - 1]!.color
}

/**
 * Apply a single-channel mask to a layer raster, scaling each pixel's
 * alpha by `mask.data[i] / 255`.
 *
 * Mask dimensions must match the raster; if they differ, the mask is
 * sampled by nearest-neighbor.
 *
 * @param raster - Layer raster (mutated in place).
 * @param mask - Layer mask.
 */
function applyMask(raster: RawImage, mask: LayerMask): void {
  const sameSize = mask.width === raster.width && mask.height === raster.height
  for (let y = 0; y < raster.height; y++) {
    for (let x = 0; x < raster.width; x++) {
      const off = (y * raster.width + x) * 4
      let mx: number
      let my: number
      if (sameSize) {
        mx = x
        my = y
      } else {
        mx = Math.min(mask.width - 1, Math.floor((x / raster.width) * mask.width))
        my = Math.min(mask.height - 1, Math.floor((y / raster.height) * mask.height))
      }
      const m = mask.data[my * mask.width + mx]! / 255
      raster.data[off + 3] = clamp(Math.round(raster.data[off + 3]! * m), 0, 255)
    }
  }
}

/**
 * Composite `layerRaster` onto `base` at `layer.position.x/y` using
 * `layer.blendMode` and `layer.opacity`.
 *
 * @param base - Document base raster.
 * @param layerRaster - Pre-rasterized layer.
 * @param layer - Original layer definition (for position/blend/opacity).
 */
function paintLayer(base: RawImage, layerRaster: RawImage, layer: Layer): void {
  const blend: BlendMode = layer.blendMode ?? 'normal'
  const opacity = layer.opacity ?? 1
  const dx = Math.round(layer.position.x)
  const dy = Math.round(layer.position.y)

  const startX = Math.max(0, dx)
  const startY = Math.max(0, dy)
  const endX = Math.min(base.width, dx + layerRaster.width)
  const endY = Math.min(base.height, dy + layerRaster.height)

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const sx = x - dx
      const sy = y - dy
      const dstOff = (y * base.width + x) * 4
      const srcOff = (sy * layerRaster.width + sx) * 4
      composePixel(blend, opacity, base.data, dstOff, layerRaster.data, srcOff)
    }
  }
}

/**
 * Paint a solid color rectangle into an RGBA buffer.
 *
 * @param out - Destination buffer.
 * @param color - RGBA color.
 * @param rect - Rectangle in pixel coordinates.
 */
function fillRect(
  out: RawImage,
  color: Rgba,
  rect: { x: number; y: number; width: number; height: number },
): void {
  const x0 = Math.max(0, rect.x)
  const y0 = Math.max(0, rect.y)
  const x1 = Math.min(out.width, rect.x + rect.width)
  const y1 = Math.min(out.height, rect.y + rect.height)
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const off = (y * out.width + x) * 4
      out.data[off] = color.r
      out.data[off + 1] = color.g
      out.data[off + 2] = color.b
      out.data[off + 3] = color.a
    }
  }
}
