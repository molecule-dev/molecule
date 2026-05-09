/**
 * CSS variables theme provider implementation.
 *
 * Applies theme values as CSS custom properties to the document root,
 * enabling framework-agnostic theming via standard CSS.
 *
 * @module
 */

import type { Theme, ThemeProvider } from '@molecule/app-theme'

import { darkTheme, lightTheme } from './themes.js'
import type { CSSVariablesThemeConfig } from './types.js'

/**
 * Converts a camelCase string to kebab-case (e.g. `'primaryColor'` → `'primary-color'`).
 * @param str - The camelCase string to convert.
 * @returns The kebab-case string.
 */
function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
}

/**
 * Applies a theme's tokens as CSS custom properties to the document root.
 * @param theme - The theme object containing all design tokens to apply.
 * @param prefix - The CSS variable prefix (e.g. `'mol'` produces `--mol-color-primary`).
 */
function applyThemeToDocument(theme: Theme, prefix: string): void {
  if (typeof document === 'undefined') return

  const root = document.documentElement

  // Colors
  for (const [key, value] of Object.entries(theme.colors)) {
    root.style.setProperty(`--${prefix}-color-${camelToKebab(key)}`, value)
  }

  // Spacing
  for (const [key, value] of Object.entries(theme.spacing)) {
    root.style.setProperty(`--${prefix}-spacing-${key}`, value)
  }

  // Border radius
  for (const [key, value] of Object.entries(theme.borderRadius)) {
    root.style.setProperty(`--${prefix}-radius-${key}`, value)
  }

  // Shadows
  for (const [key, value] of Object.entries(theme.shadows)) {
    root.style.setProperty(`--${prefix}-shadow-${key}`, value)
  }

  // Typography - font families
  for (const [key, value] of Object.entries(theme.typography.fontFamily)) {
    root.style.setProperty(`--${prefix}-font-${key}`, value)
  }

  // Typography - font sizes
  for (const [key, value] of Object.entries(theme.typography.fontSize)) {
    root.style.setProperty(`--${prefix}-text-${key}`, value)
  }

  // Typography - font weights
  for (const [key, value] of Object.entries(theme.typography.fontWeight)) {
    root.style.setProperty(`--${prefix}-font-weight-${key}`, String(value))
  }

  // Typography - line heights
  for (const [key, value] of Object.entries(theme.typography.lineHeight)) {
    root.style.setProperty(`--${prefix}-leading-${key}`, String(value))
  }

  // Breakpoints
  for (const [key, value] of Object.entries(theme.breakpoints)) {
    root.style.setProperty(`--${prefix}-breakpoint-${camelToKebab(key)}`, value)
  }

  // Transitions
  for (const [key, value] of Object.entries(theme.transitions)) {
    root.style.setProperty(`--${prefix}-transition-${key}`, value)
  }

  // Z-index
  for (const [key, value] of Object.entries(theme.zIndex)) {
    root.style.setProperty(`--${prefix}-z-${key}`, String(value))
  }

  // Set data attributes for CSS selectors
  root.setAttribute(`data-${prefix}-theme`, theme.name)
  root.setAttribute(`data-${prefix}-mode`, theme.mode)
}

/**
 * Creates a framework-agnostic ThemeProvider that applies theme tokens
 * as CSS custom properties on the document root element.
 *
 * @example
 * ```typescript
 * import { createCSSVariablesThemeProvider, lightTheme, darkTheme } from '`@molecule/app-theme-css-variables`'
 * import { setProvider } from '`@molecule/app-theme`'
 *
 * const provider = createCSSVariablesThemeProvider({
 *   themes: [lightTheme, darkTheme],
 *   defaultTheme: 'light',
 *   prefix: 'mol',
 *   persistKey: 'molecule-theme',
 * })
 *
 * setProvider(provider)
 * ```
 * @param config - Theme provider configuration (available themes, default theme, CSS variable prefix, persistence).
 * @returns A ThemeProvider that applies themes as CSS custom properties on the document root.
 */
export function createCSSVariablesThemeProvider(config: CSSVariablesThemeConfig): ThemeProvider {
  const { themes, defaultTheme, prefix = 'mol', applyToDocument = true, persistKey } = config

  // If a persistKey is set without an explicit storage adapter, fall back to
  // window.localStorage. The previous behavior — persistKey but no storage =
  // silent no-op — was the source of "I toggled dark mode and it reset on
  // reload" bugs across multiple flagships. SSR/non-browser environments
  // still get undefined and skip persistence.
  const storage =
    config.storage ??
    (typeof globalThis !== 'undefined' && (globalThis as { localStorage?: Storage }).localStorage
      ? {
          getItem: (key: string): string | null =>
            (globalThis as { localStorage: Storage }).localStorage.getItem(key),
          setItem: (key: string, value: string): void => {
            ;(globalThis as { localStorage: Storage }).localStorage.setItem(key, value)
          },
        }
      : undefined)

  let currentTheme: Theme = themes.find((t) => t.name === defaultTheme) || themes[0]

  const listeners = new Set<(theme: Theme) => void>()

  // Try to restore from storage adapter
  if (persistKey && storage) {
    const saved = storage.getItem(persistKey)
    if (saved) {
      const found = themes.find((t) => t.name === saved)
      if (found) currentTheme = found
    }
  }

  // Apply initial theme
  if (applyToDocument) {
    applyThemeToDocument(currentTheme, prefix)
  }

  const provider: ThemeProvider = {
    getTheme(): Theme {
      return currentTheme
    },

    setTheme(theme: Theme | string): void {
      const newTheme = typeof theme === 'string' ? themes.find((t) => t.name === theme) : theme
      if (!newTheme) return

      currentTheme = newTheme

      if (applyToDocument) {
        applyThemeToDocument(currentTheme, prefix)
      }

      if (persistKey && storage) {
        storage.setItem(persistKey, currentTheme.name)
      }

      listeners.forEach((fn) => fn(currentTheme))
    },

    toggleMode(): void {
      const targetMode = currentTheme.mode === 'light' ? 'dark' : 'light'
      const newTheme = themes.find((t) => t.mode === targetMode)
      if (newTheme) provider.setTheme(newTheme)
    },

    subscribe(callback: (theme: Theme) => void): () => void {
      listeners.add(callback)
      return () => {
        listeners.delete(callback)
      }
    },

    getThemes(): Theme[] {
      return themes
    },
  }

  return provider
}

/** Default CSS variables theme provider with light and dark themes. */
export const provider: ThemeProvider = createCSSVariablesThemeProvider({
  themes: [lightTheme, darkTheme],
  defaultTheme: 'light',
})
