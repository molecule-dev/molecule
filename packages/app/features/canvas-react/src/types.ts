/**
 * Shared canvas types: viewport, point/size/bounds, edge kinds, and
 * common prop shapes used across `<CanvasSurface>`, `<CanvasNode>`,
 * `<CanvasEdge>`, and the pure helpers.
 *
 * This package is the SHARED BASE for canvas-family wrappers (whiteboard,
 * mind-map, design-canvas, presentation slide-canvas). Domain-specific
 * behavior lives in the wrapper packages — this base defines only the
 * generic mechanics every variant uses.
 *
 * @module
 */

/** A 2D point in either screen-space or canvas-space. */
export interface Point {
  /** X coordinate. */
  x: number
  /** Y coordinate. */
  y: number
}

/** A 2D size in either screen-space or canvas-space. */
export interface Size {
  /** Width in the relevant coordinate space. */
  width: number
  /** Height in the relevant coordinate space. */
  height: number
}

/**
 * An axis-aligned rectangle in canvas-space (top-left origin, +x right,
 * +y down). Used for selection regions, content bounds, fitting, etc.
 */
export interface Bounds {
  /** Left edge in canvas units. */
  x: number
  /** Top edge in canvas units. */
  y: number
  /** Width in canvas units. */
  width: number
  /** Height in canvas units. */
  height: number
}

/**
 * Viewport state — the camera over the canvas. `(x, y)` is the
 * canvas-space coordinate that maps to the surface's top-left corner.
 * `zoom` is the scale factor (1 = identity, 2 = 2x zoom-in, 0.5 = zoom-out).
 */
export interface CanvasViewport {
  /** Canvas-space x at the surface's top-left corner. */
  x: number
  /** Canvas-space y at the surface's top-left corner. */
  y: number
  /** Scale factor (1 = identity, > 1 = zoomed in). */
  zoom: number
}

/**
 * Optional clamping limits for the viewport. All fields are optional;
 * omitted limits are unbounded. `bounds` constrains where `(x, y)` may
 * sit; `minZoom` / `maxZoom` clamp the zoom factor.
 */
export interface ViewportLimits {
  /** Allowed range for the viewport origin. Omit for unbounded. */
  bounds?: Bounds
  /** Minimum allowed zoom. Defaults to no minimum. */
  minZoom?: number
  /** Maximum allowed zoom. Defaults to no maximum. */
  maxZoom?: number
}

/** Kinds of edge geometry `<CanvasEdge>` knows how to draw. */
export type CanvasEdgeKind = 'line' | 'bezier' | 'orthogonal'

/**
 * Identifier for a selectable item. Generic strings so consumers can
 * use whatever id scheme matches their domain (uuid, slug, db id, etc.).
 */
export type CanvasItemId = string

/**
 * Drag callback payload for `<CanvasNode>`. `delta` is the canvas-space
 * displacement applied since the previous `onDrag` call within the same
 * gesture. `position` is the new canvas-space top-left of the node.
 */
export interface CanvasDragInfo {
  /** New canvas-space top-left position of the node. */
  position: Point
  /** Canvas-space delta since the previous drag tick. */
  delta: Point
  /** `true` on the very first move of a gesture. */
  start: boolean
  /** `true` on the final pointer-up of a gesture. */
  end: boolean
}

/**
 * Resize callback payload for `<CanvasNode>`. `size` is the new
 * canvas-space size; `position` is the new canvas-space top-left
 * (resize from a non-bottom-right handle moves the origin too).
 */
export interface CanvasResizeInfo {
  /** New canvas-space top-left position of the node. */
  position: Point
  /** New canvas-space size of the node. */
  size: Size
  /** `true` on the final pointer-up of a gesture. */
  end: boolean
}
