/**
 * `@molecule/app-maps-leaflet` — a Leaflet-backed provider for `@molecule/app-maps`.
 * Renders real slippy maps with OpenStreetMap tiles (NO API key). Bond it once at
 * startup and every `createMap` call shows a real map — the built-in default only
 * paints a grey placeholder panel.
 *
 * @example
 * ```ts
 * // In your app entry, ONCE — REQUIRED: import 'leaflet/dist/leaflet.css'
 * // (without that CSS the tiles + markers are mispositioned):
 * import { setProvider, createMap } from '@molecule/app-maps'
 * import { provider } from '@molecule/app-maps-leaflet'
 * setProvider(provider)
 *
 * // then anywhere (the container element needs an explicit height):
 * const el = document.getElementById('map') as HTMLElement
 * const map = await createMap({ container: el, center: { lat: 51.5, lng: -0.12 }, zoom: 12 })
 * map.addMarker({ id: 'a', position: { lat: 51.5, lng: -0.12 }, popup: 'Here' })
 * // …later, on unmount: map.destroy()
 * ```
 *
 * @remarks
 * TWO gotchas that decide whether the map is visible at all:
 * - **Import `leaflet/dist/leaflet.css` once** (app entry). Without it, tiles and
 *   markers are mispositioned — the #1 "my Leaflet map looks broken" cause.
 * - **The container needs an explicit height** (e.g. `style={{ height: 400 }}`); a
 *   zero-height container renders a blank map.
 *
 * Markers use a self-contained inline-SVG pin by default (no image-asset wiring —
 * this sidesteps Leaflet's default-icon 404 under bundlers); pass `icon` for a
 * custom URL. ALWAYS `destroy()` on unmount — Leaflet attaches DOM + resize
 * listeners, and re-initialising over a live container throws "Map container is
 * already initialized".
 *
 * `getSnapshot()` rejects (Leaflet has no built-in export) and `getCanvas()`
 * returns a best-effort surface — both are WebGL-provider (Mapbox/MapLibre)
 * concepts. Everything else (markers/polylines/polygons/circles/popups/viewport/
 * fitBounds/project/events) renders for real.
 *
 * BROWSER-ONLY: draws to the DOM via Leaflet. Import + wire from app/client code.
 *
 * @module
 */

export * from './provider.js'
