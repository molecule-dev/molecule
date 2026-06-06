/**
 * Map drawing — toolbar + interaction surface for authoring geofences
 * (polygons, circles, pins, lines) on top of any `@molecule/app-maps`
 * backend.
 *
 * Composes with `@molecule/app-maps` via the `mapBackend` prop +
 * `mapSlot` render slot, so swapping the underlying map provider does
 * not require changing the drawing surface.
 *
 * Used by fleet-management (delivery zones), property-management
 * (parcel boundaries), and venue-booking (event footprints).
 *
 * @example
 * ```tsx
 * import { MapDrawing } from '@molecule/app-map-drawing-react'
 * import type { MapShape } from '@molecule/app-map-drawing-react'
 *
 * <MapDrawing
 *   tools={['polygon', 'circle', 'pin']}
 *   height={500}
 *   onChange={(shapes: MapShape[]) => saveZones(shapes)}
 *   mapSlot={<MapView />}
 * />
 * ```
 * @module
 */

export * from './geometry.js'
export * from './MapDrawing.js'
export * from './MapDrawingToolbar.js'
export * from './types.js'
