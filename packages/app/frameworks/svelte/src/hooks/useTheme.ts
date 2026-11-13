/**
 * Svelte hook for theming, porting React's `useTheme` family.
 *
 * @module
 */

import { derived, type Readable } from 'svelte/store'

import type { Theme, ThemeProvider } from '@molecule/app-theme'

import { useThemeProvider } from '../context.js'
import { fieldStore, liveStore } from './live-store.js'

/** What {@link useTheme} returns. */
export interface UseThemeResult {
  /** The current theme object. */
  theme: Readable<Theme>
  /** The current theme's name. */
  themeName: Readable<string>
  /** Switches the active theme by name. */
  setTheme: (name: string) => void
  /** Toggles light/dark (the provider's `toggleMode`, or an index cycle). */
  toggleTheme: () => void
  /** The current mode: 'light' or 'dark'. */
  mode: Readable<'light' | 'dark'>
}

/**
 * Subscribe to a theme provider, supporting both `subscribe` and the legacy
 * `onThemeChange` methods.
 *
 * @param provider - The theme provider to subscribe to.
 * @param callback - Listener invoked whenever the active theme changes.
 * @returns An unsubscribe function that removes the listener.
 */
function subscribeToThemeProvider(provider: ThemeProvider, callback: () => void): () => void {
  if (typeof provider.subscribe === 'function') {
    return provider.subscribe(callback as unknown as (theme: Theme) => void)
  }
  const legacy = provider as unknown as Record<string, (...args: unknown[]) => unknown>
  if (typeof legacy.onThemeChange === 'function') {
    return legacy.onThemeChange(callback) as () => void
  }
  return () => {}
}

/**
 * Theme state and actions, React's `useTheme` in Svelte's idiom: call it
 * during component init under `setMoleculeContext({ theme })`.
 *
 * @returns Theme state as stores and the actions as functions.
 * @example
 * ```svelte
 * <script>
 *   import { useTheme } from '@molecule/app-svelte'
 *   const { themeName, toggleTheme } = useTheme()
 * </script>
 *
 * <button onclick={toggleTheme}>Current theme: {$themeName}</button>
 * ```
 */
export function useTheme(): UseThemeResult {
  const provider = useThemeProvider()
  // `getThemeName()` is not part of `ThemeProvider`; probe it the way React
  // does, so a provider that predates the theme object's `name` still works.
  const providerWithName = provider as unknown as Record<string, (...args: unknown[]) => string>
  const readName = (): string =>
    typeof providerWithName.getThemeName === 'function'
      ? providerWithName.getThemeName()
      : provider.getTheme().name
  const state = liveStore(
    () => ({ theme: provider.getTheme(), name: readName() }),
    (notify) => subscribeToThemeProvider(provider, notify),
  )

  const toggleTheme = (): void => {
    // Prefer the provider's purpose-built light/dark toggle — unlike
    // `getThemes()`, which is optional, so the index-cycle below silently
    // no-ops for providers that don't implement it. The index-cycle is kept
    // only as a fallback for non-conforming providers that predate it.
    if (typeof provider.toggleMode === 'function') {
      provider.toggleMode()
      return
    }
    const themes = provider.getThemes?.() ?? []
    if (themes.length === 0) return
    const currentName = readName()
    const currentIndex = themes.findIndex((entry: Theme | string) =>
      typeof entry === 'string' ? entry === currentName : entry.name === currentName,
    )
    const next = themes[(currentIndex + 1) % themes.length]
    provider.setTheme(typeof next === 'string' ? next : (next as Theme).name)
  }

  return {
    theme: fieldStore(state, 'theme'),
    themeName: fieldStore(state, 'name'),
    setTheme: (name: string) => provider.setTheme(name),
    toggleTheme,
    mode: derived(state, (current) => current.theme.mode),
  }
}

/**
 * The current theme object, React's `useCurrentTheme` in Svelte's idiom.
 *
 * @returns A readable store of the current theme.
 */
export function useCurrentTheme(): Readable<Theme> {
  const { theme } = useTheme()
  return theme
}

/**
 * The current theme mode, React's `useThemeMode` in Svelte's idiom.
 *
 * @returns A readable store of 'light' or 'dark'.
 */
export function useThemeMode(): Readable<'light' | 'dark'> {
  const { mode } = useTheme()
  return mode
}

/**
 * The current theme's colors, React's `useThemeColors` in Svelte's idiom.
 *
 * @returns A readable store of the current theme's colors.
 */
export function useThemeColors(): Readable<Theme['colors']> {
  const { theme } = useTheme()
  return derived(theme, (current) => current.colors)
}
