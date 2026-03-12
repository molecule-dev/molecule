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
 * @module
 */

export * from './provider.js'
export * from './themes.js'
export * from './types.js'
