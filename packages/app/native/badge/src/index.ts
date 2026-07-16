/**
 * App badge/notification count interface for molecule.dev.
 *
 * Provides a unified API for the app-icon badge across platforms: set, get,
 * clear, increment/decrement, permission handling, and capability discovery.
 * This is a core interface package — you register a platform implementation
 * once with `setProvider()`, then call the module functions anywhere.
 *
 * @example
 * ```ts
 * import type { BadgeProvider } from '@molecule/app-badge'
 * import { setProvider, setWithPermission, clear, isSupported } from '@molecule/app-badge'
 *
 * // No prebuilt provider bond ships yet — supply your platform implementation
 * // (web: navigator.setAppBadge/clearAppBadge; RN/Capacitor: the platform badge API).
 * const myBadgeProvider = {} as BadgeProvider // stand-in for your implementation
 * setProvider(myBadgeProvider)
 *
 * if (await isSupported()) {
 *   await setWithPermission(3) // requests permission if needed, then sets
 *   await clear()
 * }
 * ```
 *
 * @remarks
 * - **No prebuilt provider bond exists for this interface yet** — you MUST implement
 *   `BadgeProvider` and call `setProvider()` at startup. Every function except `isSupported()`
 *   (which returns `false`) throws until then. Ignore any runtime error text suggesting a
 *   `-capacitor` package; no such package ships.
 * - On the web, badge APIs (`navigator.setAppBadge`) only work in secure contexts and generally
 *   only for INSTALLED PWAs — in a plain browser tab expect `getPermissionStatus()` to report
 *   `unsupported`; design the feature to degrade (that is what `setWithPermission()` returning
 *   `false` means).
 * - Prefer `setWithPermission(count)` over raw `set()` — it handles the
 *   unsupported/denied/prompt permission states for you.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
