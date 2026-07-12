/**
 * Geolocation interface for molecule.dev.
 *
 * Provides a unified API for GPS/location services that works across
 * different platforms (web, Capacitor, React Native, etc.).
 *
 * @remarks
 * Location is sensitive, permissioned data — treat it carefully:
 *
 * - **Request permission at the point of use, from a user gesture** ({@link requestPermission}),
 *   NOT on load. An unexpected prompt gets denied, and a denied permission is REMEMBERED (no
 *   re-prompt — only settings).
 * - **Check {@link checkPermission} first and handle denial** — offer a manual fallback (type an
 *   address) rather than blocking; never assume it's granted.
 * - **Always {@link clearWatch} a {@link watchPosition}** when the screen unmounts — a live GPS
 *   watch drains the battery fast. Use {@link getCurrentPosition} for a one-off read.
 * - Capture only when needed and don't retain/transmit more precision than the feature requires
 *   — it's personal data.
 *
 * @module
 */

export * from './geolocation.js'
export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
export * from './web-provider.js'
