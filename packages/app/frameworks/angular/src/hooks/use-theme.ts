/**
 * Angular functions for theming, mirroring `useTheme`, `useThemeProvider`,
 * `useCurrentTheme`, `useThemeMode` and `useThemeColors` from
 * `@molecule/app-react`.
 *
 * @module
 */

import { computed, DestroyRef, effect, inject, type Signal, signal, untracked } from '@angular/core'

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
  return injectProvider(THEME_PROVIDER, 'useThemeOutsideProvider')
}

/** A provider that still offers the pre-`subscribe` change subscription. */
interface ThemeChangeSource {
  /** Calls `listener` after each theme change; returns the unsubscribe. */
  onThemeChange(listener: () => void): () => void
}

/** A provider that names its active theme through `getThemeName()`. */
interface ThemeNameSource {
  /** The active theme's name. */
  getThemeName(): string
}

/**
 * Whether the provider has an `onThemeChange` method.
 *
 * @param provider - The provider to inspect.
 * @returns `true` when `provider.onThemeChange` is a function.
 */
function hasThemeChange(provider: ThemeProvider): provider is ThemeProvider & ThemeChangeSource {
  return 'onThemeChange' in provider && typeof provider.onThemeChange === 'function'
}

/**
 * Whether the provider has a `getThemeName` method.
 *
 * @param provider - The provider to inspect.
 * @returns `true` when `provider.getThemeName` is a function.
 */
function hasThemeName(provider: ThemeProvider): provider is ThemeProvider & ThemeNameSource {
  return 'getThemeName' in provider && typeof provider.getThemeName === 'function'
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
    return provider.subscribe(callback)
  }
  if (hasThemeChange(provider)) {
    return provider.onThemeChange(callback)
  }
  return () => {}
}

/**
 * Reads the provider's current theme name, `getThemeName` when it has one.
 *
 * @param provider - The theme provider to read.
 * @returns The active theme's name.
 */
const themeNameOf = (provider: ThemeProvider): string =>
  hasThemeName(provider) ? provider.getThemeName() : provider.getTheme().name

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

  // A render with no browser (a server or build-time render) reads the theme
  // the server's markup was built from, and a hydrating client's FIRST read is
  // that same theme, so its markup matches. `getServerTheme()` is optional: a
  // provider whose theme cannot differ between the two has none, and the live
  // theme is read directly. This is React's `useSyncExternalStore` server
  // snapshot in Angular's terms.
  const serverTheme = provider.getServerTheme?.()

  // The provider as an external store, read through a cache: a provider that
  // builds a fresh theme object per call keeps the snapshot stable between
  // notifications.
  const theme = signal<Theme>(serverTheme ?? provider.getTheme())
  const themeName = signal<string>(serverTheme ? serverTheme.name : themeNameOf(provider))
  const refresh = (): void => {
    theme.set(provider.getTheme())
    themeName.set(themeNameOf(provider))
  }
  const stop = subscribeToThemeProvider(provider, refresh)
  inject(DestroyRef).onDestroy(stop)

  // The post-hydration switch: after the first render the function re-reads the
  // live theme, as React re-renders with the client snapshot right after it
  // hydrates. A provider without a server theme already shows the live theme,
  // so this read changes nothing there.
  effect(() => {
    untracked(() => refresh())
  })

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
    provider.setTheme(typeof next === 'string' ? next : next.name)
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
