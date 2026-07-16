/**
 * Map drawing — toolbar + interaction surface for authoring geofences
 * (polygons, circles, pins, lines) on top of any `@molecule/app-maps` backend.
 *
 * Exports `<MapDrawing>`, `<MapDrawingToolbar>`, geometry helpers
 * (`haversineDistanceMeters`, `closeRing`, `identityBackend`, `pointInRect`),
 * and the `MapShape` / `MapDrawingProps` / `MapDrawingBackend` types.
 *
 * Composes with `@molecule/app-maps` via two props: `mapSlot` (render the map
 * element underneath the drawing overlay) and `mapBackend` (a 3-function
 * projection adapter: `project`, `unproject`, `distanceMeters`). There is no
 * prebuilt adapter — build one from your map instance as in the example.
 *
 * Used by fleet-management (delivery zones), property-management (parcel
 * boundaries), and venue-booking (event footprints).
 *
 * @remarks
 * - When `mapBackend` is omitted, the IDENTITY backend is used: lng maps to x
 *   pixels and lat to y pixels, and "radiusMeters" is Euclidean pixels. That is
 *   intended for tests/storyboards only — always pass a real backend when shapes
 *   must be geographic.
 * - polygon/line: click adds vertices, double-click finalises (polygons need 3+
 *   vertices); circle: drag from center, release commits; pin: one per click;
 *   select: marquee-drag, then Backspace/Delete removes the selection (the
 *   surface must have keyboard focus); Escape cancels an in-progress draft.
 * - Toolbar and surface labels route through `t()` under `mapDrawing.` — the
 *   registered companion bond is `@molecule/app-locales-feature-map-drawing`.
 * - Note `@molecule/app-maps` currently ships only a placeholder provider (no
 *   real tiles); the drawing overlay works regardless, but the `mapSlot`
 *   background will be a placeholder until a real map provider is wired.
 *
 * @example
 * ```tsx
 * import { MapDrawing, haversineDistanceMeters } from '@molecule/app-map-drawing-react'
 * import type { MapDrawingBackend, MapShape } from '@molecule/app-map-drawing-react'
 * import type { MapInstance } from '@molecule/app-maps'
 *
 * // Adapt an app-maps MapInstance into a drawing backend:
 * const backendFor = (map: MapInstance): MapDrawingBackend => ({
 *   project: ([lng, lat]) => map.project({ lat, lng }),
 *   unproject: (p) => { const c = map.unproject(p); return [c.lng, c.lat] },
 *   distanceMeters: haversineDistanceMeters,
 * })
 *
 * <MapDrawing
 *   tools={['polygon', 'circle', 'pin']}
 *   height={500}
 *   mapBackend={backendFor(mapInstance)}
 *   onChange={(shapes: MapShape[]) => saveZones(shapes)}
 * />
 * ```
 * @module
 */

export * from './geometry.js'
export * from './MapDrawing.js'
export * from './MapDrawingToolbar.js'
export * from './types.js'
