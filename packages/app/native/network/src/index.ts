/**
 * Network status interface for molecule.dev.
 *
 * Framework-agnostic core for connectivity monitoring through a swappable
 * `NetworkProvider`: current status (`getStatus`, `isConnected`,
 * `getConnectionType`), change events (`onChange`, `onOnline`,
 * `onOffline`), an active reachability probe (`checkConnectivity`), and
 * offline-tolerant helpers (`waitForConnection`, `whenOnline`,
 * `createNetworkAwareFetch`, `isSuitableForLargeDownload`).
 *
 * @example
 * ```typescript
 * import {
 *   hasProvider,
 *   isConnected,
 *   onOffline,
 *   onOnline,
 * } from '@molecule/app-network'
 *
 * async function wireOfflineBanner(
 *   show: () => void,
 *   hideBanner: () => void,
 * ): Promise<() => void> {
 *   if (!hasProvider()) return () => {} // nothing wired — see remarks
 *   if (!(await isConnected())) show()
 *   const offOffline = onOffline(show)
 *   const offOnline = onOnline(hideBanner)
 *   return () => {
 *     offOffline()
 *     offOnline()
 *   }
 * }
 * ```
 *
 * @remarks
 * - **Every accessor THROWS until `setProvider()` is called — even on web.**
 *   There is NO built-in web fallback: the one prebuilt bond is
 *   `@molecule/app-network-react-native`. On web either gate on
 *   `hasProvider()` or wire a small `NetworkProvider` over
 *   `navigator.onLine` + the `online`/`offline` window events yourself.
 * - `navigator.onLine`-style signals mean "has SOME interface", not "the
 *   internet works" — for correctness-critical flows use
 *   `checkConnectivity(url)` (an actual fetch probe) before large uploads.
 * - Fields beyond `connected`/`connectionType` (`cellularGeneration`,
 *   `isMetered`, `downlinkSpeed`, `isAirplaneMode`) are best-effort and
 *   often undefined — never branch hard on them without a default.
 * - Subscriptions return unsubscribe functions — call them on unmount.
 *
 * @module
 */

export * from './network.js'
export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
