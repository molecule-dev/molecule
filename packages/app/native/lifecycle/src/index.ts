/**
 * App lifecycle interface for molecule.dev.
 *
 * Provides a unified API for app-level runtime state across platforms
 * (web, native containers, etc.): foreground/background transitions
 * (`getAppState`, `onAppStateChange`), connectivity (`getNetworkState`,
 * `onNetworkChange`), battery (`getBatteryState`), and deep-link opens
 * (`onUrlOpen`).
 *
 * @example
 * ```typescript
 * import {
 *   getAppState,
 *   onAppStateChange,
 *   onNetworkChange,
 * } from '@molecule/app-lifecycle'
 *
 * function pauseWhenHidden(pause: () => void, resume: () => void): () => void {
 *   if (getAppState() === 'active') resume()
 *   const offState = onAppStateChange((change) => {
 *     if (change.current === 'active') resume()
 *     else pause()
 *   })
 *   const offNet = onNetworkChange((net) => {
 *     if (!net.connected) pause()
 *   })
 *   return () => {
 *     offState()
 *     offNet()
 *   }
 * }
 * ```
 *
 * @remarks
 * - **No wiring is needed on web**: the first accessor call silently bonds
 *   the built-in browser provider (visibilitychange/online/Battery API).
 *   In a native container wire `@molecule/app-lifecycle-react-native` (the
 *   one prebuilt bond) via `setProvider()` BEFORE the first lifecycle call —
 *   listeners registered earlier stay attached to the auto-bonded web
 *   fallback.
 * - `getBatteryState()` resolves `null` where unavailable (most desktop
 *   browsers; the Battery Status API is Chromium-only) — always handle null.
 * - The web fallback's network info is best-effort (`navigator.onLine` +
 *   Network Information API where present); `onUrlOpen` on web only fires
 *   for in-page navigation patterns, real deep-link events need the native
 *   bond.
 * - Every `on*` subscription returns an unsubscribe function — call it on
 *   unmount.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
export * from './web-provider.js'
