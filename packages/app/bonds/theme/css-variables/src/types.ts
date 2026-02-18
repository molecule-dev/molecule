/**
 * Configuration types for the CSS variables theme provider.
 *
 * @module
 */

import type { Theme } from '@molecule/app-theme'

/**
 * Minimal storage adapter for theme persistence. Compatible with
 * localStorage, sessionStorage, or any custom implementation
 * (e.g., React Native AsyncStorage wrapper, SSR no-op).
 */
export interface ThemeStorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/**
 * Configuration for css variables theme.
 */
export interface CSSVariablesThemeConfig {
  /** Available themes. */
  themes: Theme[]
  /** Name of the default theme to use. */
  defaultTheme?: string
  /** CSS variable prefix (default: 'mol'). */
  prefix?: string
  /** Whether to auto-apply CSS variables to :root (default: true). */
  applyToDocument?: boolean
  /** Key for persisting theme preference. Requires `storage` to be set. */
  persistKey?: string
  /** Storage adapter for persisting theme preference. When omitted, persistence is disabled. */
  storage?: ThemeStorageAdapter
}
