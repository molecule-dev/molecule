/**
 * Theme bond accessor.
 *
 * Bond packages (e.g. `@molecule/app-theme-css-variables`) call
 * `setProvider()` during setup. Application code uses `getProvider()`
 * to read and switch themes, toggle dark/light mode, and subscribe
 * to theme changes.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'

import type { Theme } from './types.js'

/**
 * Manages theme state including the active theme, mode toggling,
 * and change subscriptions.
 */
export interface ThemeProvider {
  /**
   * Returns the currently active theme.
   */
  getTheme(): Theme

  /**
   * Sets the active theme by reference or by name.
   *
   * @param theme - A `Theme` object or a theme name string to activate.
   */
  setTheme(theme: Theme | string): void

  /**
   * Toggles between light and dark mode for the active theme.
   */
  toggleMode(): void

  /**
   * Subscribes to theme changes. The callback fires whenever
   * `setTheme()` or `toggleMode()` is called.
   *
   * @param callback - Invoked with the new theme after each change.
   * @returns An unsubscribe function.
   */
  subscribe(callback: (theme: Theme) => void): () => void

  /**
   * Returns all registered themes. Optional — not all providers
   * support multiple themes.
   */
  getThemes?(): Theme[]
}

const BOND_TYPE = 'theme'

/**
 * Registers a theme provider as the active singleton.
 *
 * @param provider - The theme provider implementation to bond.
 */
export const setProvider = (provider: ThemeProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded theme provider, or `null` if none is configured.
 *
 * @returns The bonded theme provider, or `null`.
 */
export const getProvider = (): ThemeProvider | null => bondGet<ThemeProvider>(BOND_TYPE) ?? null

/**
 * Checks whether a theme provider is currently bonded.
 *
 * @returns `true` if a theme provider is bonded.
 */
export const hasProvider = (): boolean => isBonded(BOND_TYPE)
