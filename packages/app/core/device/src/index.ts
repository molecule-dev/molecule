/**
 * Device information interface for molecule.dev.
 *
 * Provides device, browser, and OS detection utilities
 * for analytics, feature detection, and platform-specific behavior.
 *
 * @example
 * ```typescript
 * import { getDeviceInfo, supports, isStandalone } from '@molecule/app-device'
 *
 * const device = getDeviceInfo()          // { browser, os, isMobile, type, … }
 * if (device.isMobile) enableCompactNav()
 * if (supports('webShare')) showShareButton()
 * if (isStandalone()) hideInstallBanner() // already installed as a PWA
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
