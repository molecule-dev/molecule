/**
 * Theme-to-CSS conversion utilities.
 *
 * @module
 */

import { camelToKebab } from './utilities.js'

/**
 * Minimal theme shape required by themeToCSS().
 * Structurally compatible with Theme from `@molecule/app-theme`.
 */
interface ThemeLike {
  colors: Record<string, string | number>
  spacing: Record<string, string | number>
  typography: { fontSize: Record<string, string | number> }
  borderRadius: Record<string, string | number>
  shadows: Record<string, string | number>
}

/**
 * Maps a molecule theme to CSS custom properties.
 *
 * @example
 * ```typescript
 * const cssVars = themeToCSS(theme)
 * // Use in style attribute or inject into :root
 * ```
 *
 * @param theme - A theme object with colors, spacing, typography, borderRadius, and shadows.
 * @returns A flat record of CSS custom properties (e.g. `{ '--color-primary': '#3b82f6' }`).
 */
export const themeToCSS = (theme: ThemeLike): Record<string, string> => {
  const vars: Record<string, string> = {}

  // Colors
  for (const [key, value] of Object.entries(theme.colors)) {
    vars[`--color-${camelToKebab(key)}`] = String(value)
  }

  // Spacing
  for (const [key, value] of Object.entries(theme.spacing)) {
    vars[`--spacing-${key}`] = String(value)
  }

  // Typography
  for (const [key, value] of Object.entries(theme.typography.fontSize)) {
    vars[`--font-size-${key}`] = String(value)
  }

  // Border radius
  for (const [key, value] of Object.entries(theme.borderRadius)) {
    vars[`--radius-${key}`] = String(value)
  }

  // Shadows
  for (const [key, value] of Object.entries(theme.shadows)) {
    vars[`--shadow-${key}`] = String(value)
  }

  return vars
}
