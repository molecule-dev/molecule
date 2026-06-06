/**
 * Map interface for molecule.dev.
 *
 * Provides a unified API for interactive maps that works with
 * different map libraries (MapBox, Google Maps, Leaflet, etc.).
 *
 * @example
 * ```tsx
 * import { createSimpleMapProvider, setProvider, getProvider } from '@molecule/app-maps'
 *
 * // Wire the placeholder provider at app startup
 * // (swap for @molecule/app-maps-mapbox or -google in production)
 * setProvider(createSimpleMapProvider())
 *
 * // Create a map instance mounted to a container element
 * const map = await getProvider().createMap({
 *   container: document.getElementById('map')!,
 *   center: { lat: 37.7749, lng: -122.4194 },
 *   zoom: 12,
 * })
 *
 * map.addMarker({ id: 'hq', position: { lat: 37.7749, lng: -122.4194 }, title: 'HQ' })
 * map.on('click', (e) => console.log('clicked', e))
 * ```
 * @module
 */

export * from './map.js'
export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
