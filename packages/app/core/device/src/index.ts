/**
 * Device information interface for molecule.dev.
 *
 * Provides device, browser, and OS detection utilities
 * for analytics, feature detection, and platform-specific behavior.
 *
 * @example
 * ```typescript
 * import {
 *   createWebDeviceProvider,
 *   getDeviceInfo,
 *   isStandalone,
 *   setProvider,
 *   supports,
 * } from '@molecule/app-device'
 *
 * // Optional in a browser (the first call auto-bonds this same web provider);
 * // native shells / SSR bond their own DeviceProvider here instead.
 * setProvider(createWebDeviceProvider())
 *
 * const device = getDeviceInfo() // parsed from navigator.userAgent: { type, isMobile, browser, os, … }
 * const layout = device.isMobile ? 'compact' : 'full' // coarse layout only
 * const showShareButton = supports('webShare') // feature detection, not browser sniffing
 * const showInstallBanner = !isStandalone() // false once installed as a PWA
 *
 * console.log(device.type, device.browser.name, device.os.name, layout, showShareButton, showInstallBanner)
 * ```
 *
 * @remarks
 * - **Zero-config in browsers.** The first call auto-bonds the built-in web
 *   provider; only non-browser platforms (native shells, SSR) need
 *   `setProvider()` with a platform provider.
 * - **Prefer feature detection over identity sniffing.** Gate behavior on
 *   `supports('feature')` / `getFeatureSupport()`, not on browser/OS names —
 *   UA parsing is heuristic and breaks with new versions. Use `getDeviceInfo()`
 *   for analytics labels and coarse layout choices (`isMobile`/`type`), not for
 *   capability decisions.
 * - **`getDeviceInfo()`, `getHardwareInfo()` and `getFeatureSupport()`/`supports()`
 *   are computed ONCE per provider and cached** (only `getScreenInfo()` re-reads).
 *   Re-read `getScreenInfo()` (or use CSS/ClassMap breakpoints) on resize — do not
 *   expect `isMobile` to change when the window is resized.
 * - **Known limitation: iPhone/iPad user agents report `os.name === 'macOS'`**
 *   (their UA contains "like Mac OS X", which the parser matches first). `isMobile`
 *   / `type` are still correct — do not branch on `os.name === 'iOS'`.
 * - `isOnline()` is a snapshot, not a subscription — for reactive online/offline
 *   UI, listen to the platform's connectivity events and re-read it.
 * - Device data is client-supplied and spoofable: never use it for authorization
 *   or server-side trust decisions.
 *
 * @module
 */

export * from './capabilities.js'
export * from './detection.js'
export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
