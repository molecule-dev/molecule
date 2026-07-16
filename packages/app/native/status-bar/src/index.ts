/**
 * Status bar customization interface for molecule.dev.
 *
 * Framework-agnostic core for the mobile status bar through a swappable
 * `StatusBarProvider`: `setStyle` (light/dark icons), `setBackgroundColor`,
 * `show`/`hide`, overlay mode (`setOverlaysWebView`), state/height queries,
 * one-shot `configure`, and theme `presets` + `applyPreset`.
 *
 * @example
 * ```typescript
 * import {
 *   getCapabilities,
 *   hasProvider,
 *   setBackgroundColor,
 *   setStyle,
 * } from '@molecule/app-status-bar'
 *
 * async function matchStatusBarToTheme(dark: boolean): Promise<void> {
 *   if (!hasProvider()) return // web/desktop: browsers have no status bar
 *   await setStyle(dark ? 'light' : 'dark') // icon color over your header
 *   const caps = await getCapabilities()
 *   if (caps.canSetBackgroundColor) {
 *     await setBackgroundColor(dark ? '#0f172a' : '#ffffff')
 *   }
 * }
 * ```
 *
 * @remarks
 * - **Every accessor THROWS until `setProvider()` is called.** The one
 *   prebuilt bond is `@molecule/app-status-bar-react-native`; **web has no
 *   bond** — browsers expose no status bar (`theme-color` meta is the
 *   closest web concept and is app code, not this package). Gate on
 *   `hasProvider()`.
 * - **Capability-gate everything beyond style/visibility.**
 *   `setBackgroundColor` and `setOverlaysWebView` are Android-only in the
 *   react-native bond (silent no-ops on iOS), and `getHeight()` returns 0
 *   on iOS — use safe-area insets for layout, never this value.
 * - `setStyle('light')` means LIGHT ICONS (for dark backgrounds), not a
 *   light bar — the naming trips everyone; pair style changes with the
 *   header color they sit over (or use `applyPreset`).
 * - `getState()` reflects what this provider last set, not changes made
 *   elsewhere (e.g. a navigation library managing the bar itself).
 *
 * @module
 */

export * from './presets.js'
export * from './provider.js'
export * from './status-bar.js'
export * from './types.js'
export * from './utilities.js'
