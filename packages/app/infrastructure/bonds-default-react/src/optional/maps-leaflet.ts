/**
 * Wiring for the optional `@molecule/app-maps` bond.
 *
 * Its own module + subpath export so a bundler only resolves these providers when
 * an app actually imports them — see `./realtime-socketio.js` for the full
 * rationale. `@molecule/app-maps` is the import that first exposed the problem:
 * it is the alphabetically-first unresolvable provider, so it is the one Rolldown
 * named while the other 14 were equally broken.
 *
 * @module
 */

/**
 * Wires `@molecule/app-maps-leaflet` (Leaflet + OpenStreetMap, no API key) to
 * `@molecule/app-maps` — a real slippy map instead of the core's grey placeholder.
 * REQUIRES `import 'leaflet/dist/leaflet.css'` once in the app entry (the scaffolded
 * `bonds/app-maps-leaflet.ts` does this); without it tiles + markers mis-position.
 */
export async function setupAppMapsLeaflet(): Promise<void> {
  const [{ setProvider: setMaps }, { provider }] = await Promise.all([
    import('@molecule/app-maps'),
    import('@molecule/app-maps-leaflet'),
  ])
  setMaps(provider)
}
