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
 * prebuilt adapter — build one from your map instance as in the example (until the map
 * instance exists, pass `undefined` and the identity backend is used).
 *
 * Used by fleet-management (delivery zones), property-management (parcel
 * boundaries), and venue-booking (event footprints).
 *
 * @remarks
 * - When `mapBackend` is omitted, the IDENTITY backend is used: lng maps to x
 *   pixels and lat to y pixels, and "radiusMeters" is Euclidean pixels. That is
 *   intended for tests/storyboards only — always pass a real backend when shapes
 *   must be geographic.
 * - Shape state is INTERNAL: `initialShapes` seeds it once (later changes are ignored) and
 *   `onChange` receives the FULL shape list after every add/delete — persist that list; there
 *   is no controlled `shapes` prop.
 * - Coordinates are GeoJSON `[lng, lat]` (longitude FIRST); circles are `kind: 'circle'` with a
 *   `Point` geometry and `properties.radiusMeters`.
 * - The drawing overlay sits on top of `mapSlot` and captures pointer events, so the map
 *   cannot be panned/zoomed by dragging while the surface is showing. Set the map's viewport
 *   in code (`createMap({ center, zoom })`).
 * - It calls `useTranslation()` from `@molecule/app-react`, so it MUST render inside
 *   `<I18nProvider>` / `<MoleculeProvider>`, and `getClassMap()` throws unless
 *   `setClassMap(classMap)` from `@molecule/app-ui` ran at startup.
 * - polygon/line: click adds vertices, double-click finalises (polygons need 3+
 *   vertices); circle: drag from center, release commits; pin: one per click;
 *   select: marquee-drag, then Backspace/Delete removes the selection (the
 *   surface must have keyboard focus); Escape cancels an in-progress draft.
 * - Toolbar and surface labels route through `t()` under `mapDrawing.` — the
 *   registered companion bond is `@molecule/app-locales-feature-map-drawing`.
 * - Without a wired maps provider `@molecule/app-maps` falls back to a grey placeholder
 *   whose `project`/`unproject` return 0 — every shape lands at `[0, 0]`. Wire a real one
 *   (e.g. `setProvider(provider)` from `@molecule/app-maps-leaflet`) at startup.
 *
 * @example
 * ```tsx
 * import { useEffect, useMemo, useRef, useState } from 'react'
 *
 * import {
 *   haversineDistanceMeters,
 *   MapDrawing,
 *   type MapDrawingBackend,
 *   type MapShape,
 * } from '@molecule/app-map-drawing-react'
 * import { createMap, type MapInstance } from '@molecule/app-maps'
 *
 * // Assumes a maps provider was wired at startup, e.g. setProvider(provider) from `@molecule/app-maps-leaflet`.
 * export function DeliveryZonesEditor({ onSave }: { onSave: (zones: MapShape[]) => void }) {
 *   const mapEl = useRef<HTMLDivElement>(null)
 *   const [map, setMap] = useState<MapInstance | null>(null)
 *
 *   useEffect(() => {
 *     const container = mapEl.current
 *     if (!container) return
 *     let instance: MapInstance | null = null
 *     let cancelled = false
 *     void Promise.resolve(createMap({ container, center: { lat: 40.7128, lng: -74.006 }, zoom: 12 })).then((m) => {
 *       if (cancelled) return m.destroy()
 *       instance = m
 *       setMap(m)
 *     })
 *     return () => {
 *       cancelled = true
 *       instance?.destroy()
 *     }
 *   }, [])
 *
 *   // Geographic projection through the live map — re-reads pan/zoom on every call.
 *   const backend = useMemo<MapDrawingBackend | undefined>(
 *     () =>
 *       map
 *         ? {
 *             project: ([lng, lat]) => map.project({ lat, lng }),
 *             unproject: (p) => {
 *               const c = map.unproject(p)
 *               return [c.lng, c.lat]
 *             },
 *             distanceMeters: haversineDistanceMeters,
 *           }
 *         : undefined,
 *     [map],
 *   )
 *
 *   return (
 *     <MapDrawing
 *       tools={['polygon', 'circle', 'pin']}
 *       height={500}
 *       mapSlot={<div ref={mapEl} style={{ height: '100%' }} />}
 *       mapBackend={backend}
 *       onChange={onSave}
 *     />
 *   )
 * }
 * ```
 *
 * @module
 */

export * from './geometry.js'
export * from './MapDrawing.js'
export * from './MapDrawingToolbar.js'
export * from './types.js'
