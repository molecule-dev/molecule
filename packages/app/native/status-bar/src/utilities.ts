/**
 * `@molecule/app-status-bar`
 * Utility functions for status bar
 */

import { configure } from './status-bar.js'

/**
 * Set status bar for light theme
 * @param backgroundColor - Optional background color (default: white)
 */
export async function setLightTheme(backgroundColor = '#ffffff'): Promise<void> {
  await configure({
    backgroundColor,
    style: 'dark',
  })
}

/**
 * Set status bar for dark theme
 * @param backgroundColor - Optional background color (default: black)
 */
export async function setDarkTheme(backgroundColor = '#000000'): Promise<void> {
  await configure({
    backgroundColor,
    style: 'light',
  })
}

/**
 * Make status bar match a color (auto-detect style)
 * @param color - Hex color to match
 */
export async function matchColor(color: string): Promise<void> {
  const style = isLightColor(color) ? 'dark' : 'light'
  await configure({
    backgroundColor: color,
    style,
  })
}

/**
 * Check if a color is light (for determining text color)
 * @param color - Hex color
 * @returns Whether light color.
 */
export function isLightColor(color: string): boolean {
  // Remove # if present
  const hex = color.replace('#', '')

  // Parse RGB
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  return luminance > 0.5
}

/**
 * Get the CSS environment variable value for the top safe area inset,
 * with a fallback of 0px. Useful for positioning content below the status bar.
 * @returns A CSS `env(safe-area-inset-top)` expression string.
 */
export function getSafeAreaInsetTop(): string {
  return 'env(safe-area-inset-top, 0px)'
}
