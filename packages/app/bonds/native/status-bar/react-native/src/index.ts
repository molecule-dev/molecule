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
 * - **`getHeight()` returns 0 on iOS** (`StatusBar.currentHeight` is Android-only) —
 *   use safe-area insets for layout, not this value.
 * - `getState()` reflects what THIS provider last set (locally tracked), not values
 *   changed elsewhere (e.g. by a navigation library's own status-bar handling).
 * - `initialStyle`/`initialBackgroundColor` config only seed the tracked snapshot —
 *   they do not apply anything at startup; call `configure({ … })` once at launch to
 *   actually set the bar.
 *
 * @module @molecule/app-status-bar-react-native
 */

export * from './provider.js'
export * from './types.js'
