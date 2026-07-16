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
 * IMPORTANT: no real map SDK integration ships today. The only built-in
 * provider is `createSimpleMapProvider()`, a PLACEHOLDER that renders a static
 * grey panel ("Map Placeholder") instead of a map — markers are tracked in
 * memory but never drawn, overlays/events/projection are no-ops, and
 * `getSnapshot()` resolves to an empty string. To show a real map, implement
 * `MapProvider` against your chosen SDK (Leaflet, MapLibre, Mapbox GL, Google
 * Maps JS — install the SDK yourself) and wire it with
 * `setProvider(myProvider)` (equivalent to `bond('maps', myProvider)`).
 *
 * @remarks
 * - `getProvider()` silently falls back to the placeholder when nothing is
 *   wired — a forgotten `setProvider` does not throw, it just renders the grey
 *   placeholder panel. Use `hasProvider()` to detect real wiring.
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
