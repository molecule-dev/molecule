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
 * Build the declaration body (CSS custom-property lines) for a single theme.
 */
function buildDeclarations(theme: Theme, prefix: string): string {
  const lines: string[] = []
  for (const [key, value] of Object.entries(theme.colors)) {
    lines.push(`  --${prefix}-color-${camelToKebab(key)}: ${value};`)
  }
  for (const [key, value] of Object.entries(theme.spacing)) {
    lines.push(`  --${prefix}-spacing-${key}: ${value};`)
  }
  for (const [key, value] of Object.entries(theme.borderRadius)) {
    lines.push(`  --${prefix}-radius-${key}: ${value};`)
  }
  for (const [key, value] of Object.entries(theme.shadows)) {
    lines.push(`  --${prefix}-shadow-${key}: ${value};`)
  }
  for (const [key, value] of Object.entries(theme.typography.fontFamily)) {
    lines.push(`  --${prefix}-font-${key}: ${value};`)
  }
  for (const [key, value] of Object.entries(theme.typography.fontSize)) {
    lines.push(`  --${prefix}-text-${key}: ${value};`)
  }
  for (const [key, value] of Object.entries(theme.typography.fontWeight)) {
    lines.push(`  --${prefix}-font-weight-${key}: ${String(value)};`)
  }
  for (const [key, value] of Object.entries(theme.typography.lineHeight)) {
    lines.push(`  --${prefix}-leading-${key}: ${String(value)};`)
  }
  for (const [key, value] of Object.entries(theme.breakpoints)) {
    lines.push(`  --${prefix}-breakpoint-${camelToKebab(key)}: ${value};`)
  }
  for (const [key, value] of Object.entries(theme.transitions)) {
    lines.push(`  --${prefix}-transition-${key}: ${value};`)
  }
  for (const [key, value] of Object.entries(theme.zIndex)) {
    lines.push(`  --${prefix}-z-${key}: ${String(value)};`)
  }
  return lines.join('\n')
}

/**
 * Apply the active theme to the document.
 *
 * Strategy: inject a single `<style>` element holding ONE rule per
 * registered theme, each scoped with `:where(...)` so the rules have ZERO
 * specificity. This lets an app's own `theme.css` (e.g. plain
 * `:root { … }` or `[data-mol-mode="dark"] { … }`, both specificity 0,1,0)
 * always win, while still giving apps that ship no theme.css a working
 * baseline. The selector for the mode-matching theme bumps to the active
 * mode via the `data-{prefix}-mode` attribute the function also writes.
 *
 * Without `:where()` the provider's inline / high-specificity styles
 * defeated every per-app `[data-mol-mode="dark"]` block, leaving the
 * fleet's brand-specific dark palettes unreachable. See
 * `__tests__/provider.test.ts` for the regression that pinned this.
 *
 * @param themes - All themes registered with the provider.
 * @param activeTheme - The currently-selected theme (drives data-attrs + class).
 * @param prefix - CSS variable prefix (e.g. `'mol'` → `--mol-color-primary`).
 */
function applyThemeToDocument(themes: Theme[], activeTheme: Theme, prefix: string): void {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  const styleId = `${prefix}-theme-vars`

  // Build/refresh the single stylesheet with one :where()-wrapped rule per theme.
  let style = document.getElementById(styleId) as HTMLStyleElement | null
  if (!style) {
    style = document.createElement('style')
    style.id = styleId
    // Insert as early as possible so source-order ties go to app stylesheets
    // imported later. The :where() wrapper makes specificity moot, but
    // injecting at <head> top is the safest belt-and-braces.
    const head = document.head || document.documentElement
    head.insertBefore(style, head.firstChild)
  }

  const rules: string[] = []
  // Default (light/baseline) rule — always present, selects :root unconditionally
  // but inside :where(), so specificity is 0,0,0.
  const baseline = themes.find((t) => t.mode === 'light') || themes[0]
  if (baseline) {
    rules.push(`:where(:root) {\n${buildDeclarations(baseline, prefix)}\n}`)
  }
  // Per-mode rules — fire when the active mode attribute matches.
  for (const t of themes) {
    rules.push(`:where([data-${prefix}-mode="${t.mode}"]) {\n${buildDeclarations(t, prefix)}\n}`)
  }
  style.textContent = rules.join('\n\n')

  // Set data attributes for CSS selectors
  root.setAttribute(`data-${prefix}-theme`, activeTheme.name)
  root.setAttribute(`data-${prefix}-mode`, activeTheme.mode)

  // Also toggle a `.dark` class on <html>. Many app templates rely on the
  // Tailwind `dark:` modifier — which the generator wires via
  // `@custom-variant dark (&:where(.dark, .dark *))` in index.css — so
  // without this class on the root, every `dark:bg-*` / `dark:text-*` etc.
  // utility silently no-ops on theme toggle.
  root.classList.toggle('dark', activeTheme.mode === 'dark')
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
  // Guard against partial localStorage shims (some test runners stub
  // `globalThis.localStorage = {}` without methods); only adopt it when
  // both getItem and setItem are real functions.
  const browserStorage = (globalThis as { localStorage?: Partial<Storage> }).localStorage
  const storage =
    config.storage ??
    (browserStorage &&
    typeof browserStorage.getItem === 'function' &&
    typeof browserStorage.setItem === 'function'
      ? {
          getItem: (key: string): string | null =>
            (browserStorage.getItem as (k: string) => string | null)(key),
          setItem: (key: string, value: string): void => {
            ;(browserStorage.setItem as (k: string, v: string) => void)(key, value)
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
    applyThemeToDocument(themes, currentTheme, prefix)
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
        applyThemeToDocument(themes, currentTheme, prefix)
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
