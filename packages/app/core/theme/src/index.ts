/**
 * Theme interface and utilities for molecule.dev.
 *
 * Framework-agnostic theme contract — a {@link Theme} (colors, spacing,
 * typography, radii, shadows, z-index) plus a {@link ThemeProvider} bond for
 * reading/switching themes, dark/light toggling, and change subscriptions.
 * Bond a provider (e.g. `@molecule/app-theme-css-variables`, which applies the
 * palette as CSS variables) at startup; {@link lightTheme}/{@link darkTheme}
 * are the base defaults.
 *
 * @example
 * ```typescript
 * import { darkTheme, getProvider, lightTheme, setProvider } from '@molecule/app-theme'
 * import { createCSSVariablesThemeProvider } from '@molecule/app-theme-css-variables'
 *
 * // Startup (bonds.ts): writes the --mol-* CSS variables + data-mol-mode on <html>
 * setProvider(
 *   createCSSVariablesThemeProvider({
 *     themes: [lightTheme, darkTheme], // toggleMode() needs one theme of EACH mode
 *     defaultTheme: 'light',
 *     systemDefault: true, // follow prefers-color-scheme until the user picks one
 *     persistKey: 'app-theme', // remember the user's choice across reloads
 *   }),
 * )
 *
 * const theme = getProvider() // null when no theme bond is wired — guard, don't assume
 * const unsubscribe = theme?.subscribe((next) => console.log(next.mode, next.colors.background))
 *
 * theme?.toggleMode() // logs 'dark' '#…' — e.g. from the header's light/dark toggle
 * console.log(document.documentElement.getAttribute('data-mol-mode')) // 'dark'
 *
 * unsubscribe?.() // on unmount
 * ```
 *
 * @remarks
 * - **Recoloring: find the REAL source of truth first.** Apps scaffolded from a
 *   template ship a per-app stylesheet (e.g. `app/src/theme.css`) that
 *   hardcodes the `--color-*` variables and loads AFTER the bond — its values
 *   win, and editing this package's `Theme` objects (or the bond's palette) has
 *   NO visible effect there. Precedence: per-app theme stylesheet > theme
 *   bond > base defaults. Recolor by editing whichever file actually defines
 *   the variables; the bond's `Theme` palette applies only when no per-app
 *   stylesheet defines colors.
 * - Read theme values through the provider or the CSS variables it emits —
 *   never hardcode hex values in components; surfaces and status colors come
 *   from the theme so light AND dark both work.
 * - {@link getProvider} returns `null` when nothing is bonded — theme switching
 *   is optional; guard rather than throw.
 * - `setTheme('name')` with a name that is not in the provider's `themes` is a
 *   SILENT no-op, and `toggleMode()` does nothing unless a theme of the opposite
 *   `mode` is registered.
 * - `createLightTheme`/`createDarkTheme` overrides REPLACE whole sections
 *   (`colors: {...}` must be a complete `ThemeColors`) — spread
 *   `lightTheme.colors` yourself to change a few colors.
 *
 * @module
 */

export * from './provider.js'
export * from './themes.js'
export * from './types.js'
export * from './utilities.js'
