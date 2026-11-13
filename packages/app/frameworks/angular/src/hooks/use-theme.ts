/**
 * Angular functions for theming, mirroring `useTheme`, `useThemeProvider`,
 * `useCurrentTheme`, `useThemeMode` and `useThemeColors` from
 * `@molecule/app-react`.
 *
 * @module
 */

import { computed, DestroyRef, inject, type Signal, signal } from '@angular/core'

import type { Theme, ThemeProvider } from '@molecule/app-theme'

import { injectProvider } from '../inject.js'
import { THEME_PROVIDER } from '../tokens.js'

/**
 * The theme provider registered by `provideMolecule({ theme })` or
 * `provideTheme`. Call it in an injection context.
 *
 * @returns The theme provider.
 * @throws {Error} When no theme provider is registered.
 */
export function useThemeProvider(): ThemeProvider {
  return injectProvider(
    THEME_PROVIDER,
    'useThemeOutsideProvider',
    'useThemeProvider must be used within a ThemeProvider',
  )
}

/**
 * Subscribes to a theme provider, supporting both `subscribe` and the legacy
 * `onThemeChange` method, exactly like React's hook.
 *
 * @param provider - The theme provider to subscribe to.
 * @param callback - Listener invoked whenever the active theme changes.
 * @returns An unsubscribe function that removes the listener.
 */
function subscribeToThemeProvider(provider: ThemeProvider, callback: () => void): () => void {
  if (typeof provider.subscribe === 'function') {
    return provider.subscribe(callback as unknown as (theme: Theme) => void)
  }
  if (
    typeof (provider as unknown as Record<string, (...args: unknown[]) => unknown>)
      .onThemeChange === 'function'
  ) {
    return (
      provider as unknown as Record<string, (...args: unknown[]) => () => void>
    ).onThemeChange(callback)
  }
  return () => {}
}

/** Reads the provider's current theme name, `getThemeName` when it has one. */
const themeNameOf = (provider: ThemeProvider): string =>
  typeof (provider as unknown as Record<string, (...args: unknown[]) => string>).getThemeName ===
  'function'
    ? (provider as unknown as Record<string, (...args: unknown[]) => string>).getThemeName()
    : provider.getTheme().name

/**
 * What {@link useTheme} returns: the current theme, its name and mode as
 * signals, and the actions as plain functions.
 */
export interface UseThemeResult {
  /** The current theme object. */
  readonly theme: Signal<Theme>
  /** The current theme's name. */
  readonly themeName: Signal<string>
  /** The current theme's mode (`'light'` or `'dark'`). */
  readonly mode: Signal<'light' | 'dark'>
  /** Sets the theme by name. */
  setTheme: (name: string) => void
  /** Toggles the theme mode, preferring the provider's `toggleMode()`. */
  toggleTheme: () => void
}

/**
 * Theme state and actions. Call it in an injection context (a component field
 * initializer or constructor).
 *
 * @returns The theme, its name and mode as signals, and the actions.
 */
export function useTheme(): UseThemeResult {
  const provider = useThemeProvider()

  // The provider as an external store, read through a cache: a provider that
  // builds a fresh theme object per call keeps the snapshot stable between
  // notifications.
  const theme = signal<Theme>(provider.getTheme())
  const themeName = signal<string>(themeNameOf(provider))
  const refresh = (): void => {
    theme.set(provider.getTheme())
    themeName.set(themeNameOf(provider))
  }
  const stop = subscribeToThemeProvider(provider, refresh)
  inject(DestroyRef).onDestroy(stop)

  const setTheme = (name: string): void => {
    provider.setTheme(name)
  }

  const toggleTheme = (): void => {
    // Prefer the provider's purpose-built light/dark toggle; the index-cycle
    // below stays only as a fallback for providers predating `toggleMode`.
    if (typeof provider.toggleMode === 'function') {
      provider.toggleMode()
      return
    }
    const themes = provider.getThemes?.() ?? []
    if (themes.length === 0) return
    const currentName = themeNameOf(provider)
    const currentIndex = themes.findIndex((entry: Theme | string) =>
      typeof entry === 'string' ? entry === currentName : entry.name === currentName,
    )
    const nextIndex = (currentIndex + 1) % themes.length
    const next = themes[nextIndex]
    provider.setTheme(typeof next === 'string' ? next : (next as Theme).name)
  }

  return {
    theme: theme.asReadonly(),
    themeName: themeName.asReadonly(),
    mode: computed(() => theme().mode),
    setTheme,
    toggleTheme,
  }
}

/**
 * The current theme object alone. Call it in an injection context.
 *
 * @returns A signal of the current theme.
 */
export function useCurrentTheme(): Signal<Theme> {
  return useTheme().theme
}

/**
 * The current theme mode alone. Call it in an injection context.
 *
 * @returns A signal of `'light'` or `'dark'`.
 */
export function useThemeMode(): Signal<'light' | 'dark'> {
  return useTheme().mode
}

/**
 * The current theme's color palette. Call it in an injection context.
 *
 * @returns A signal of the current theme's colors.
 */
export function useThemeColors(): Signal<Theme['colors']> {
  const { theme } = useTheme()
  return computed(() => theme().colors)
}
