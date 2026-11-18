/**
 * Public types for the map-drawing feature.
 *
 * Geometries follow the GeoJSON spec (RFC 7946) so shapes round-trip
 * cleanly through any GeoJSON-aware backend (PostGIS, Mapbox, Leaflet,
 * Google Maps, Turf, etc.). The component itself only needs the small
 * subset of geometry types listed below — `Point` (pins), `LineString`
 * (polylines), and `Polygon` (closed rings). Circles are non-standard
 * in GeoJSON, so they are encoded as a `Point` plus a numeric
 * `radiusMeters` in `properties` (the same convention Mapbox-GL-Draw
 * uses).
 *
 * @module
 */

/**
 * GeoJSON Point — `[lng, lat]` (longitude first, per the spec).
 */
export interface GeoJsonPoint {
  /** Geometry type discriminator. */
  type: 'Point'
  /** Single position — `[lng, lat]`. */
  coordinates: [number, number]
}

/**
 * GeoJSON LineString — sequence of two-or-more positions.
 */
export interface GeoJsonLineString {
  /** Geometry type discriminator. */
  type: 'LineString'
  /** Ordered list of positions — `[lng, lat]` pairs. */
  coordinates: [number, number][]
}

/**
 * GeoJSON Polygon — outer ring + optional holes. The drawing surface
 * only authors the outer ring; holes are preserved verbatim if present
 * on `initialShapes`.
 */
export interface GeoJsonPolygon {
  /** Geometry type discriminator. */
  type: 'Polygon'
  /**
   * Array of linear rings. The first ring is the outer boundary; any
   * subsequent rings are holes. Each ring is a closed sequence of
   * `[lng, lat]` positions where the first and last positions are
   * identical.
   */
  coordinates: [number, number][][]
}

/**
 * Union of GeoJSON geometry kinds the drawing surface understands.
 */
export type GeoJsonGeometry = GeoJsonPoint | GeoJsonLineString | GeoJsonPolygon

/**
 * Drawn shape carried by the component. The `kind` discriminator is
 * kept independent of the GeoJSON `type` because circles share the
 * `Point` geometry (a radius lives in `properties`).
 */
export interface MapShape {
  /** Stable identifier for the shape (used as the component key). */
  id: string
  /** Logical shape kind. Drives toolbar selection + rendering style. */
  kind: 'polygon' | 'circle' | 'pin' | 'line'
  /** GeoJSON geometry. */
  geometry: GeoJsonGeometry
  /**
   * Free-form caller properties carried alongside the geometry. The
   * `radiusMeters` key is reserved for circle shapes and is required
   * when `kind === 'circle'`.
   */
  properties?: Record<string, unknown> & { radiusMeters?: number }
}

/**
 * Tools the toolbar may show. The fixed set is the four drawing tools
 * plus two action tools (`select`, `delete`). The component renders
 * the four drawing tools by default (`tools` prop) and always shows
 * `select` + `delete` because they have no opt-out semantic.
 */
export type DrawingTool = 'polygon' | 'circle' | 'pin' | 'line'

/**
 * Active tool — either one of the drawing tools or one of the action
 * modes (`select`).
 */
export type ActiveTool = DrawingTool | 'select'

/**
 * Screen-space point in CSS pixels relative to the drawing surface's
 * bounding box. `(0, 0)` is the top-left corner.
 */
export interface ScreenPoint {
  /** Horizontal offset in CSS pixels. */
  x: number
  /** Vertical offset in CSS pixels. */
  y: number
}

/**
 * Backend the drawing surface delegates projection + great-circle
 * distance to. Production callers pass an adapter wired to
 * `@molecule/app-maps`'s `MapInstance` (`project` / `unproject`); test
 * callers can pass a stub backend that uses identity projection.
 *
 * The backend abstraction means the component never depends on a
 * specific map provider — swap Mapbox for Google Maps for Leaflet by
 * swapping the backend, not the drawing surface.
 */
export interface MapDrawingBackend {
  /**
   * Project a `[lng, lat]` position to a screen-space pixel coordinate
   * inside the drawing surface's bounding box.
   *
   * @param coordinates - `[lng, lat]` position.
   * @returns Pixel offset relative to the drawing surface.
   */
  project(coordinates: [number, number]): ScreenPoint

  /**
   * Unproject a screen-space pixel coordinate back to `[lng, lat]`.
   *
   * @param point - Pixel offset relative to the drawing surface.
   * @returns Geographic position in `[lng, lat]` order.
   */
  unproject(point: ScreenPoint): [number, number]

  /**
   * Distance in meters between two `[lng, lat]` positions. Used to
   * compute circle radii from drag distance. Production backends
   * should use the Haversine great-circle formula; the default
   * fallback uses an equirectangular approximation that is fine for
   * small drag deltas at non-polar latitudes.
   *
   * @param a - First position.
   * @param b - Second position.
   * @returns Distance in meters.
   */
  distanceMeters(a: [number, number], b: [number, number]): number
}

/**
 * Selection set — keyed by shape id. Stored as a `Set<string>` so
 * delete operations stay O(1) regardless of how many shapes are drawn.
 */
export type ShapeSelection = ReadonlySet<string>

/** MapDrawingToolbar component props. */
export interface MapDrawingToolbarProps {
  /** Drawing tools to expose (in declaration order). */
  tools: DrawingTool[]
  /** Currently active tool. */
  activeTool: ActiveTool
  /** Called when the user clicks a tool button. */
  onActiveToolChange: (tool: ActiveTool) => void
  /** Called when the user clicks the delete-selected button. */
  onDeleteSelected: () => void
  /** Whether anything is currently selected (drives delete-button enabled state). */
  hasSelection: boolean
  /** Whether a draft (path vertices, circle or marquee) is in progress (drives cancel-button enabled state). */
  hasDraft: boolean
  /** Called when the user clicks the cancel-draft button. */
  onCancelDraft: () => void
}

/**
 * Props accepted by {@link MapDrawing} — the same props
 * `@molecule/app-map-drawing-react` accepts. The `mapSlot` node prop is
 * projected content in Angular (`[slot=mapSlot]`), so it is typed `unknown`.
 */
export interface MapDrawingProps {
  /** Initial shapes to seed the surface with. */
  initialShapes?: MapShape[]
  /** Called whenever the shape list changes (add / edit / delete). */
  onChange: (shapes: MapShape[]) => void
  /** Drawing tools to expose. Defaults to the four built-in tools. */
  tools?: DrawingTool[]
  /** Externally controlled active tool. When omitted, the component manages tool state internally. */
  activeTool?: ActiveTool
  /** Called when the active tool changes. */
  onActiveToolChange?: (tool: ActiveTool) => void
  /** Map backend used to project between geographic and screen coordinates. */
  mapBackend?: MapDrawingBackend
  /** Optional map background, projected as `[slot=mapSlot]` content. */
  mapSlot?: unknown
  /** Width of the surface (CSS) — defaults to `100%`. */
  width?: number | string
  /** Height of the surface (CSS) — defaults to `400`. */
  height?: number | string
  /** Extra classes merged onto the root element. */
  className?: string
}
