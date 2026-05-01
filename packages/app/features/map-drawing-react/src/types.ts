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
  /** Stable identifier for the shape (used as a React key). */
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
