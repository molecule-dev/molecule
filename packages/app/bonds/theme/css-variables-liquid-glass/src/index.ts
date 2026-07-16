/**
 * Liquid glass theme preset for molecule.dev.
 *
 * Provides translucent, frosted-glass-inspired light and dark themes
 * designed to pair with backdrop-filter blur effects. Uses the standard
 * CSS custom properties provider from `@molecule/app-theme-css-variables`.
 *
 * @example
 * ```typescript
 * import { createCSSVariablesThemeProvider, lightTheme, darkTheme } from '@molecule/app-theme-css-variables-liquid-glass'
 * import { setProvider } from '@molecule/app-theme'
 *
 * const provider = createCSSVariablesThemeProvider({
 *   themes: [lightTheme, darkTheme],
 *   defaultTheme: 'dark',
 *   persistKey: 'molecule-theme',
 * })
 *
 * setProvider(provider)
 * ```
 *
 * @remarks
 * - The frosted BLUR comes from the ClassMap, not from these themes: pair with
 *   `@molecule/app-ui-tailwind-glass` (`setClassMap(classMap)`), which layers
 *   `backdrop-filter` onto surface components. These themes alone give
 *   translucent colors with no blur.
 * - Same precedence trap as the base bond: template-based apps ship
 *   `app/src/theme.css` whose `--color-*` variables SHADOW these theme colors —
 *   when `theme.css` defines colors, wiring this preset changes nothing visible;
 *   port the glass palette into `theme.css` instead (see
 *   `@molecule/app-theme-css-variables` remarks for the full mechanism).
 *
 * @module
 */

export * from './provider.js'
export * from './themes.js'
export * from './types.js'
