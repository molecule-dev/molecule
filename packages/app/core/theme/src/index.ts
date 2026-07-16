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
 * import { getProvider } from '@molecule/app-theme'
 *
 * const theme = getProvider() // null until a bond is wired at startup
 * theme?.toggleMode() // light <-> dark
 * const unsubscribe = theme?.subscribe((t) => applyBranding(t))
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
 *
 * @module
 */

export * from './provider.js'
export * from './themes.js'
export * from './types.js'
export * from './utilities.js'
