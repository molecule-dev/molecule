/**
 * Pure coordinate-transform helpers for the canvas surface.
 *
 * The canvas viewport defines a camera: `(viewport.x, viewport.y)` is
 * the canvas-space coordinate that maps to the surface's top-left
 * corner, and `viewport.zoom` is the scale factor.
 *
 * Conversions:
 *   screen = (canvas - viewport) * zoom
 *   canvas = screen / zoom + viewport
 *
 * @module
 */

import type { Bounds, CanvasViewport, Point, Size, ViewportLimits } from './types.js'

/**
 * Convert a screen-space point (relative to the surface's top-left)
 * into canvas-space. Inverse of {@link canvasToScreen}.
 *
 * @param point - Screen-space point in pixels.
 * @param viewport - Current viewport state.
 * @returns The same point expressed in canvas-space.
 */
export function screenToCanvas(point: Point, viewport: CanvasViewport): Point {
  const safeZoom = viewport.zoom === 0 ? 1 : viewport.zoom
  return {
    x: point.x / safeZoom + viewport.x,
    y: point.y / safeZoom + viewport.y,
  }
}

/**
 * Convert a canvas-space point into screen-space (relative to the
 * surface's top-left). Inverse of {@link screenToCanvas}.
 *
 * @param point - Canvas-space point.
 * @param viewport - Current viewport state.
 * @returns The same point expressed in screen-space pixels.
 */
export function canvasToScreen(point: Point, viewport: CanvasViewport): Point {
  return {
    x: (point.x - viewport.x) * viewport.zoom,
    y: (point.y - viewport.y) * viewport.zoom,
  }
}

/**
 * Clamp a viewport to optional limits. `bounds` (if provided) constrains
 * where the viewport origin may sit; `minZoom` / `maxZoom` clamp zoom.
 * Returns a new viewport — does not mutate the input.
 *
 * If `bounds` is provided AND has positive width/height, the origin is
 * clamped so the surface still overlaps the bounds when fully zoomed
 * out. (Wrappers can layer richer rules on top via `onViewportChange`.)
 *
 * @param viewport - The desired viewport.
 * @param limits - Optional clamping limits.
 * @returns A clamped viewport.
 */
export function clampViewport(viewport: CanvasViewport, limits?: ViewportLimits): CanvasViewport {
  if (!limits) return viewport
  let { x, y, zoom } = viewport
  if (typeof limits.minZoom === 'number') zoom = Math.max(limits.minZoom, zoom)
  if (typeof limits.maxZoom === 'number') zoom = Math.min(limits.maxZoom, zoom)
  if (limits.bounds) {
    const b = limits.bounds
    x = Math.max(b.x, Math.min(b.x + b.width, x))
    y = Math.max(b.y, Math.min(b.y + b.height, y))
  }
  return { x, y, zoom }
}

/**
 * Compute the viewport that fits a canvas-space bounds rectangle into a
 * surface of the given screen-space size, with optional padding (in
 * screen-space pixels) around the content.
 *
 * The returned viewport centers the content, but if either dimension
 * is zero the center is well-defined (the bounds origin) and zoom is
 * clamped to `1`.
 *
 * @param bounds - Canvas-space content rectangle to fit.
 * @param surface - Screen-space size of the surface.
 * @param padding - Screen-space padding around the content (default 0).
 * @returns A viewport that frames `bounds` inside the surface.
 */
export function fitToBounds(bounds: Bounds, surface: Size, padding = 0): CanvasViewport {
  if (surface.width <= 0 || surface.height <= 0 || bounds.width <= 0 || bounds.height <= 0) {
    return { x: bounds.x, y: bounds.y, zoom: 1 }
  }
  const availableW = Math.max(1, surface.width - padding * 2)
  const availableH = Math.max(1, surface.height - padding * 2)
  const zoomX = availableW / bounds.width
  const zoomY = availableH / bounds.height
  const zoom = Math.min(zoomX, zoomY)
  // Center the content in the surface.
  const contentScreenW = bounds.width * zoom
  const contentScreenH = bounds.height * zoom
  const offsetX = (surface.width - contentScreenW) / 2
  const offsetY = (surface.height - contentScreenH) / 2
  return {
    x: bounds.x - offsetX / zoom,
    y: bounds.y - offsetY / zoom,
    zoom,
  }
}
