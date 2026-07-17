/**
 * Map provider contract for molecule.dev — a unified, framework-agnostic API
 * (create map, viewport control, markers, polylines/polygons/circles, popups,
 * events, geocoding hooks) designed so different map SDKs can sit behind one
 * interface.
 *
 * Exports the `MapProvider` / `MapInstance` / config types, the bond-wiring
 * helpers (`provider`, `setProvider`, `getProvider`, `hasProvider`,
 * `createMap`), geometry utilities (`calculateBounds`, `calculateCenter`,
 * `calculateDistance`), and `createSimpleMapProvider()`.
 *
 * IMPORTANT: for a REAL map, bond **`@molecule/app-maps-leaflet`** (Leaflet +
 * OpenStreetMap tiles, no API key): `import 'leaflet/dist/leaflet.css'` once,
 * then `import { provider } from '@molecule/app-maps-leaflet'` +
 * `setProvider(provider)` (equivalent to `bond('maps', provider)`) at startup.
 * The built-in `createSimpleMapProvider()` is only a PLACEHOLDER — it renders a
 * static grey panel ("Map Placeholder", tagged `data-mol-map-placeholder`)
 * instead of a map and `console.warn`s once when it engages (markers tracked in
 * memory but never drawn, overlays/events no-ops). Use the placeholder only in
 * tests / before the real provider is wired. (To use a different SDK — MapLibre,
 * Mapbox GL, Google Maps — implement `MapProvider` against it; but the Leaflet
 * bond covers the common "show a map with pins" case with zero config.)
 *
 * @remarks
 * - `getProvider()` falls back to the placeholder when nothing is wired — a
 *   forgotten `setProvider` does not throw; the placeholder renders a grey
 *   panel AND `console.warn`s once (naming the gap and the fix) so the omission
 *   is visible, not silent. Use `hasProvider()` to detect real wiring.
 * - The map fills 100% of its container: the container element must have an
 *   explicit height or the map/placeholder is invisible (a zero-height parent
 *   is the classic blank-screen trap).
 * - When `config.container` is an element-id string, the element must already
 *   exist in the DOM at `createMap()` time or it crashes.
 * - Placeholder text is localizable via `@molecule/app-locales-maps`
 *   (`maps.placeholder.title` / `maps.placeholder.description`) or the
 *   `createSimpleMapProvider({ placeholderTitle, placeholderDescription })`
 *   options.
 * - Custom providers must return the normalized `MapInstance` shape — never
 *   leak the underlying SDK object except through `getInstance()`.
 *
 * @example
 * ```tsx
 * import { createSimpleMapProvider, setProvider, getProvider } from '@molecule/app-maps'
 *
 * // Development placeholder (renders a grey panel, NOT a real map).
 * // For production, implement MapProvider against your map SDK and wire that
 * // provider here instead.
 * setProvider(createSimpleMapProvider())
 *
 * const container = document.getElementById('map')
 * if (container) {
 *   const map = await getProvider().createMap({
 *     container, // must have an explicit CSS height
 *     center: { lat: 37.7749, lng: -122.4194 },
 *     zoom: 12,
 *   })
 *   map.addMarker({ id: 'hq', position: { lat: 37.7749, lng: -122.4194 }, title: 'HQ' })
 *   map.on('click', (e) => console.log('clicked', e))
 * }
 * ```
 * @module
 */

export * from './map.js'
export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
