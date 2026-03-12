/**
 * CSS variables theme provider for liquid glass themes.
 *
 * Re-exports the factory function from the base CSS variables provider.
 * The liquid glass preset only changes the theme color palette, not the
 * provider mechanism.
 *
 * @module
 */

export type {
  CSSVariablesThemeConfig,
  ThemeStorageAdapter,
} from '@molecule/app-theme-css-variables'
export { createCSSVariablesThemeProvider } from '@molecule/app-theme-css-variables'
