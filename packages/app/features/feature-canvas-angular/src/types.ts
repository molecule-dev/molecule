/**
 * Shared canvas types: viewport, point/size/bounds, edge kinds, and
 * common prop shapes used across `<CanvasSurface>`, `<CanvasNode>`,
 * `<CanvasEdge>`, and the pure helpers.
 *
 * This package is the SHARED BASE for canvas-family wrappers (whiteboard,
 * mind-map, design-canvas, presentation slide-canvas). It is the Angular
 * counterpart of `@molecule/app-feature-canvas-react`: the same names, the
 * same props (React spelling) and the same DOM for the same input. Node props
 * are projected content in Angular (an input cannot carry a node), so they are
 * typed `unknown`.
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

/** Props accepted by the {@link CanvasSurface} component. */
export interface CanvasSurfaceProps {
  /**
   * Controlled viewport. If omitted, the surface manages its own
   * viewport state via {@link useCanvasViewport}.
   */
  viewport?: CanvasViewport
  /**
   * Initial viewport (uncontrolled mode only). Ignored when `viewport`
   * is supplied.
   */
  initialViewport?: CanvasViewport
  /**
   * Called whenever the viewport changes (pan, zoom, or external set).
   * Required when `viewport` is supplied (controlled mode).
   */
  onViewportChange?: (next: CanvasViewport) => void
  /** Optional clamping limits applied on every viewport update. */
  limits?: ViewportLimits
  /**
   * Wheel-zoom factor per scroll tick. Multiplied for zoom-in (deltaY < 0)
   * and divided for zoom-out (deltaY > 0). Defaults to `1.1`.
   */
  zoomFactor?: number
  /**
   * If `true`, dragging anywhere on the surface pans (children that
   * stop propagation on pointerdown will still capture their own
   * gestures — the typical pattern for nodes). Defaults to `true`.
   */
  panOnDrag?: boolean
  /**
   * Called when an empty-area pointerdown fires. Useful for clearing
   * selection on background clicks.
   */
  onBackgroundPointerDown?: (e: PointerEvent) => void
  /** Width of the surface in CSS pixels. */
  width: number
  /** Height of the surface in CSS pixels. */
  height: number
  /** Optional aria-label override (defaults to a translated label). */
  ariaLabel?: string
  /** Children render in canvas-coordinate-space (projected content). */
  children?: unknown
  /** Extra classes merged onto the outer wrapper. */
  className?: string
}

/** Props accepted by the {@link CanvasNode} component. */
export interface CanvasNodeProps {
  /** Optional id, surfaced on `data-canvas-node-id` and via `onSelect`. */
  id?: CanvasItemId
  /** Canvas-space top-left position of the node. */
  position: Point
  /** Optional canvas-space size. If omitted, the node sizes to content. */
  size?: Size
  /**
   * Whether the node is currently selected. Drives `data-selected`, and a
   * selected node is described as "Selected" to screen readers.
   */
  selected?: boolean
  /**
   * Called when the user activates the node (pointerdown that doesn't
   * become a drag). Receives the node id (if set) and the original
   * pointer event so consumers can read modifier keys for additive
   * selection.
   */
  onSelect?: (id: CanvasItemId | undefined, e: PointerEvent) => void
  /**
   * Called continuously during a drag gesture. The base does NOT
   * mutate `position` itself — consumers update their own state from
   * `info.position` and feed it back through props.
   *
   * Drag deltas are computed in CANVAS-space using the surface's
   * current zoom (read from the parent surface's `data-canvas-zoom`).
   */
  onDrag?: (info: CanvasDragInfo) => void
  /**
   * Called continuously during a resize gesture from the SE corner.
   * `info.size` is canvas-space; `info.position` matches the original
   * top-left (resize-from-SE doesn't shift the origin).
   */
  onResize?: (info: CanvasResizeInfo) => void
  /** Optional aria-label override (defaults to a translated label). */
  ariaLabel?: string
  /** Children render inside the node, in canvas-space (projected content). */
  children?: unknown
  /** Extra classes merged onto the wrapper. */
  className?: string
}

/** Props accepted by the {@link CanvasEdge} component. */
export interface CanvasEdgeProps {
  /** Edge starting point in canvas-space. */
  from: Point
  /** Edge ending point in canvas-space. */
  to: Point
  /**
   * Edge geometry. `'line'` is a straight segment, `'bezier'` is a
   * cubic with horizontal-first handles, `'orthogonal'` is a
   * right-angle path that goes horizontal-then-vertical from `from`.
   * Defaults to `'line'`.
   */
  kind?: CanvasEdgeKind
  /** Stroke width in canvas units. Defaults to `2`. */
  strokeWidth?: number
  /** SVG `stroke` attribute (color). Defaults to `'currentColor'`. */
  stroke?: string
  /** Optional aria-label override (defaults to a translated label). */
  ariaLabel?: string
  /** Extra classes merged onto the wrapper. */
  className?: string
}

/** Result of {@link useCanvasViewport}. */
export interface UseCanvasViewportResult {
  /** Current viewport. */
  viewport: CanvasViewport
  /** Replace the viewport (clamped to `limits` if supplied). */
  setViewport: (next: CanvasViewport) => void
  /** Pan by a screen-space delta in pixels (interpreted via the current zoom). */
  panBy: (deltaX: number, deltaY: number) => void
  /**
   * Zoom around a screen-space focal point. `factor > 1` zooms in,
   * `< 1` zooms out. The focal point's canvas-space position is held
   * fixed across the zoom.
   */
  zoomBy: (factor: number, focalScreenX: number, focalScreenY: number) => void
  /** Reset to the initial viewport. */
  reset: () => void
}

/** Result of {@link useCanvasSelection}. */
export interface UseCanvasSelectionResult {
  /** Read-only selected ids. */
  selected: ReadonlySet<CanvasItemId>
  /** `true` if `id` is in the selection. */
  isSelected: (id: CanvasItemId) => boolean
  /**
   * Replace the selection. If `additive` is true, `ids` are merged into
   * the existing selection; otherwise the selection is replaced.
   */
  select: (ids: readonly CanvasItemId[], additive?: boolean) => void
  /** Toggle a single id's membership. */
  toggle: (id: CanvasItemId) => void
  /** Remove a single id. */
  deselect: (id: CanvasItemId) => void
  /** Clear the entire selection. */
  clear: () => void
}
