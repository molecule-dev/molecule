/**
 * Geolocation interface for molecule.dev.
 *
 * Provides a unified API for GPS/location services that works across
 * different platforms (web, native containers, etc.): one-off reads
 * (`getCurrentPosition`), continuous watches (`watchPosition` /
 * `clearWatch`), a permission flow (`checkPermission` /
 * `requestPermission`), and a pure `calculateDistance` helper.
 *
 * @example
 * ```typescript
 * import {
 *   checkPermission,
 *   clearWatch,
 *   getCurrentPosition,
 *   requestPermission,
 *   watchPosition,
 * } from '@molecule/app-geolocation'
 *
 * async function showNearby(): Promise<void> {
 *   if ((await checkPermission()) !== 'granted') {
 *     const p = await requestPermission() // from a user gesture
 *     if (p !== 'granted') return // offer manual address entry instead
 *   }
 *   const { coords } = await getCurrentPosition({ enableHighAccuracy: false })
 *   console.log(coords.latitude, coords.longitude)
 * }
 *
 * function trackRun(onPoint: (lat: number, lng: number) => void): () => void {
 *   const watchId = watchPosition((pos) =>
 *     onPoint(pos.coords.latitude, pos.coords.longitude),
 *   )
 *   return () => clearWatch(watchId) // ALWAYS clear on unmount
 * }
 * ```
 *
 * @remarks
 * Location is sensitive, permissioned data — treat it carefully:
 *
 * - **No wiring is needed on web**: the first accessor call silently bonds
 *   the built-in browser provider (`createWebGeolocationProvider`). No
 *   native bond package ships with molecule — in a native container wire
 *   your own `GeolocationProvider` via `setProvider()` BEFORE the first
 *   geolocation call, or the web fallback gets bonded instead.
 * - **HTTPS (secure context) is required on web** — on plain http the
 *   browser reports permission denied without ever prompting. localhost is
 *   exempt.
 * - **Request permission at the point of use, from a user gesture**
 *   (`requestPermission`), NOT on load. An unexpected prompt gets denied,
 *   and a denied permission is REMEMBERED (no re-prompt — only settings).
 * - **Check `checkPermission` first and handle denial** — offer a manual
 *   fallback (type an address) rather than blocking; never assume granted.
 * - **Always `clearWatch` a `watchPosition`** when the screen unmounts — a
 *   live GPS watch drains the battery fast. Use `getCurrentPosition` for a
 *   one-off read.
 * - Capture only when needed and don't retain/transmit more precision than
 *   the feature requires — it's personal data.
 *
 * @module
 */

export * from './geolocation.js'
export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
export * from './web-provider.js'
