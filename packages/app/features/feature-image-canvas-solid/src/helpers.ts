/**
 * Framework-free helpers of the Solid Canvas2D image-editing surface — the same
 * values `@molecule/app-feature-image-canvas-react` exports.
 *
 * @module
 */

import type { ImageCanvasFilters, PanOffset } from './types.js'

/**
 * Clamp a numeric value into the closed interval `[min, max]`. Returns
 * `min` for non-finite inputs.
 *
 * @param value - The value to clamp.
 * @param min - Inclusive minimum.
 * @param max - Inclusive maximum.
 * @returns The clamped value.
 */
export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  if (value < min) return min
  if (value > max) return max
  return value
}

/**
 * Compose a CSS filter string from a set of `ImageCanvasFilters` values.
 * Out-of-range values are clamped; omitted / non-finite fields are
 * ignored. Returns `'none'` when no filters are active so callers can
 * assign the result directly to `CanvasRenderingContext2D.filter`.
 *
 * @param filters - The filter parameters. May be `undefined`.
 * @returns A CSS filter string, or `'none'` when nothing applies.
 */
export function composeFilterString(filters?: ImageCanvasFilters): string {
  if (!filters) return 'none'
  const parts: string[] = []

  if (filters.brightness !== undefined && Number.isFinite(filters.brightness)) {
    const v = Math.max(0, filters.brightness)
    if (v !== 1) parts.push(`brightness(${v})`)
  }
  if (filters.contrast !== undefined && Number.isFinite(filters.contrast)) {
    const v = Math.max(0, filters.contrast)
    if (v !== 1) parts.push(`contrast(${v})`)
  }
  if (filters.saturation !== undefined && Number.isFinite(filters.saturation)) {
    const v = Math.max(0, filters.saturation)
    if (v !== 1) parts.push(`saturate(${v})`)
  }
  if (filters.hue !== undefined && Number.isFinite(filters.hue)) {
    const v = ((filters.hue % 360) + 360) % 360
    if (v !== 0) parts.push(`hue-rotate(${v}deg)`)
  }
  if (filters.sepia !== undefined && Number.isFinite(filters.sepia)) {
    const v = clamp(filters.sepia, 0, 1)
    if (v > 0) parts.push(`sepia(${v})`)
  }
  if (filters.grayscale !== undefined && Number.isFinite(filters.grayscale)) {
    const v = clamp(filters.grayscale, 0, 1)
    if (v > 0) parts.push(`grayscale(${v})`)
  }
  if (filters.blur !== undefined && Number.isFinite(filters.blur)) {
    const v = Math.max(0, filters.blur)
    if (v > 0) parts.push(`blur(${v}px)`)
  }
  if (filters.sharpen !== undefined && Number.isFinite(filters.sharpen)) {
    const v = clamp(filters.sharpen, 0, 1)
    // Approximate sharpen as a small contrast bump. 1.0 = +50% contrast.
    if (v > 0) parts.push(`contrast(${1 + 0.5 * v})`)
  }

  return parts.length === 0 ? 'none' : parts.join(' ')
}

/**
 * Convert a screen-space (canvas-relative) point into image-space
 * coordinates given the current zoom + pan and the source image
 * dimensions. Useful for tools that need to know which image pixel a
 * pointer event hit (cropping, picking, masking).
 *
 * @param point - The canvas-space point in CSS pixels (origin top-left
 *   of the canvas element).
 * @param canvasSize - The canvas size in CSS pixels.
 * @param imageSize - The source image's natural size in pixels.
 * @param zoom - The current zoom factor. Non-positive values fall back
 *   to `1`.
 * @param pan - The current pan offset in CSS pixels.
 * @returns The corresponding point in image-space coordinates.
 */
export function screenToCanvas(
  point: { x: number; y: number },
  canvasSize: { width: number; height: number },
  imageSize: { width: number; height: number },
  zoom: number,
  pan: PanOffset,
): { x: number; y: number } {
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1
  const cx = canvasSize.width / 2
  const cy = canvasSize.height / 2
  // The image is drawn centred at (cx + pan.x, cy + pan.y) and scaled by
  // `safeZoom` from its natural size. Inverting that mapping yields the
  // image-space pixel for an arbitrary canvas-space point.
  const dx = point.x - cx - pan.x
  const dy = point.y - cy - pan.y
  return {
    x: dx / safeZoom + imageSize.width / 2,
    y: dy / safeZoom + imageSize.height / 2,
  }
}

/**
 * Clamp a pan offset so the (zoomed) image cannot be dragged entirely
 * off-canvas. The clamp keeps at least half of the image visible in
 * each axis. Non-finite inputs are treated as `0`.
 *
 * @param pan - The desired pan offset, in CSS pixels.
 * @param canvasSize - The canvas size in CSS pixels.
 * @param imageSize - The source image's natural size in pixels.
 * @param zoom - The current zoom factor. Non-positive values fall back
 *   to `1`.
 * @returns The clamped pan offset.
 */
export function clampPan(
  pan: PanOffset,
  canvasSize: { width: number; height: number },
  imageSize: { width: number; height: number },
  zoom: number,
): PanOffset {
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1
  const halfImgW = (imageSize.width * safeZoom) / 2
  const halfImgH = (imageSize.height * safeZoom) / 2
  const halfCanvasW = canvasSize.width / 2
  const halfCanvasH = canvasSize.height / 2
  // Allow the image centre to move up to (halfCanvas + halfImg/2) — i.e.
  // half the image always stays visible.
  const maxX = halfCanvasW + halfImgW / 2
  const maxY = halfCanvasH + halfImgH / 2
  const px = Number.isFinite(pan.x) ? pan.x : 0
  const py = Number.isFinite(pan.y) ? pan.y : 0
  return {
    x: clamp(px, -maxX, maxX),
    y: clamp(py, -maxY, maxY),
  }
}
