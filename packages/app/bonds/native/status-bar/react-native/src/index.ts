/**
 * React Native status bar provider for molecule.dev.
 *
 * Implements the `StatusBarProvider` interface from `@molecule/app-status-bar`
 * using React Native's `StatusBar` API: bar style, visibility, background color,
 * and translucency.
 *
 * @example
 * ```typescript
 * import { setProvider, setStyle } from '@molecule/app-status-bar'
 * import { provider } from '@molecule/app-status-bar-react-native'
 *
 * setProvider(provider)
 * await setStyle('light') // light text over a dark header
 * ```
 *
 * @remarks
 * - **Android-only surfaces:** `setBackgroundColor()` and `setOverlaysWebView()`
 *   (translucency) are Android APIs — silent no-ops on iOS. Style (`light`/`dark`)
 *   and visibility work on both platforms.
 * - **`getCapabilities()` reports per-platform truthfully:** `canSetBackgroundColor`
 *   and `canSetOverlay` are `false` on iOS (the Android-only no-op APIs above) and
 *   `true` on Android, so callers can feature-detect instead of trusting a blanket
 *   `true`.
 * - **`getHeight()` returns 0 on iOS** (`StatusBar.currentHeight` is Android-only) —
 *   use safe-area insets for layout, not this value.
 * - `getState()` reflects what THIS provider last set (locally tracked), not values
 *   changed elsewhere (e.g. by a navigation library's own status-bar handling).
 * - `initialStyle`/`initialBackgroundColor` config are applied to the native bar at
 *   provider setup (best-effort, fire-and-forget): a configured `initialStyle` calls
 *   `setBarStyle` on both platforms, and `initialBackgroundColor` calls
 *   `setBackgroundColor` on Android only (the API is a no-op on iOS). Unset knobs are
 *   left untouched, so the OS / navigation library keeps control of them.
 *
 * @module @molecule/app-status-bar-react-native
 */

export * from './provider.js'
export * from './types.js'
