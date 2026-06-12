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
 * @remarks
 * Recoloring a scaffolded app — where the palette actually lives:
 *
 * This bond writes `--mol-color-*` variables and toggles light/dark via a
 * `data-mol-mode` attribute. In `@molecule/app-ui-tailwind`'s `base.css` the
 * Tailwind `@theme` reads each core token as
 * `--color-primary: var(--mol-color-primary, <default>)`, so for a CUSTOM build
 * (no per-app `theme.css`) this bond's `Theme` objects ARE the palette — edit
 * `colors` here to recolor.
 *
 * BUT template-based apps ship `app/src/theme.css` that hardcodes `--color-*` on
 * `:root` / `[data-mol-mode='dark']`. Those have the same `:root` specificity and
 * load last, so they SHADOW the `var(--mol-color-*)` reference — the visible
 * colors come only from `theme.css`. When `theme.css` defines colors, editing
 * this bond has NO visible effect; recolor by editing `app/src/theme.css`. This
 * bond still drives light/dark mode and is the palette for non-Tailwind targets
 * (e.g. React Native). Precedence: `theme.css` > this bond > base defaults.
 *
 * @module
 */

export * from './provider.js'
export * from './themes.js'
export * from './types.js'
