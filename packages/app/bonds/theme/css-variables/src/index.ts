/**
 * CSS custom properties theme provider for molecule.dev.
 *
 * Provides a framework-agnostic ThemeProvider implementation that applies
 * theme tokens as CSS custom properties (variables) to the document root.
 * Works with any framework -- React, Vue, Svelte, Angular, Solid, or vanilla JS.
 *
 * @example
 * ```typescript
 * import {
 *   createCSSVariablesThemeProvider,
 *   lightTheme,
 *   darkTheme,
 * } from '@molecule/app-theme-css-variables'
 * import { setProvider } from '@molecule/app-theme'
 *
 * const provider = createCSSVariablesThemeProvider({
 *   themes: [lightTheme, darkTheme],
 *   defaultTheme: 'light',
 *   persistKey: 'molecule-theme',
 * })
 *
 * setProvider(provider)
 * ```
 *
 * Then use CSS variables in your stylesheets:
 * ```css
 * .button {
 *   background-color: var(--mol-color-primary);
 *   color: var(--mol-color-text-inverse);
 *   padding: var(--mol-spacing-sm) var(--mol-spacing-md);
 *   border-radius: var(--mol-radius-md);
 *   transition: background-color var(--mol-transition-fast);
 * }
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './themes.js'
export * from './types.js'
