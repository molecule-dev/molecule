/**
 * React Native lifecycle provider for molecule.dev.
 *
 * Uses react-native `AppState` + `Linking` to implement the
 * `LifecycleProvider` interface from `@molecule/app-lifecycle`: app-state
 * changes, deep-link URL opens, and memory warnings.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/app-lifecycle'
 * import { provider } from '@molecule/app-lifecycle-react-native'
 *
 * setProvider(provider)   // once, at app startup — before any lifecycle call
 * ```
 *
 * @remarks
 * - **Wire `setProvider()` before any lifecycle call.** The core lazily bonds a
 *   browser-API WEB fallback on first use — subscribe early with no provider
 *   bonded and you're on the web provider, not this one.
 * - **Only app-state, URL-open, and memory-warning events fire.**
 *   `onNetworkChange`, `onBatteryChange`, and `onTerminate` accept listeners
 *   but are NEVER invoked by this bond, and `getBatteryState()` always
 *   resolves `null` — use `@molecule/app-network-react-native` for reactive
 *   connectivity and a dedicated battery integration (e.g. expo-battery)
 *   instead.
 * - `getNetworkState()` performs an active HTTP HEAD probe on every call — by
 *   default to `https://clients3.google.com/generate_204`. Point
 *   `connectivityCheckUrl` at your own endpoint if third-party egress is a
 *   concern; `connectionType` is always `'unknown'` here.
 * - `getLaunchInfo().coldStart` is always `true`; `destroy()` detaches the
 *   native subscriptions.
 *
 * @module @molecule/app-lifecycle-react-native
 */

export * from './provider.js'
export * from './types.js'
