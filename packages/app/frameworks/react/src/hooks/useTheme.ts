/**
 * React hook for theming.
 *
 * @module
 */

import { useCallback, useContext, useMemo, useSyncExternalStore } from 'react'

import { t } from '@molecule/app-i18n'
import type { Theme, ThemeProvider } from '@molecule/app-theme'

import { ThemeContext } from '../contexts.js'
import type { UseThemeResult } from '../types.js'

/**
 * Hook to access the theme provider from context.
 *
 * @returns The theme provider from context
 * @throws {Error} Error if used outside of ThemeProvider
 */
export function useThemeProvider(): ThemeProvider {
  const provider = useContext(ThemeContext)
  if (!provider) {
    throw new Error(
      t('react.error.useThemeOutsideProvider', undefined, {
        defaultValue: 'useThemeProvider must be used within a ThemeProvider',
      }),
    )
  }
  return provider
}

/**
 * Subscribe to a theme provider, supporting both `subscribe` and `onThemeChange` methods.
 * @param provider - The ThemeProvider instance to subscribe to.
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

/**
 * Hook for theme state and actions.
 *
 * @returns Theme state and actions
 *
 * @example
 * ```tsx
 * const { theme, themeName, setTheme, toggleTheme } = useTheme()
 *
 * return (
 *   <button onClick={toggleTheme}>
 *     Current theme: {themeName}
 *   </button>
 * )
 * ```
 */
export function useTheme(): UseThemeResult {
  const provider = useThemeProvider()

  // The provider as an external store: the theme and its name, re-read only
  // when the provider announces a change. Reading through a cache (rather than
  // calling `getTheme()` on every render) keeps the snapshot stable for a
  // provider that builds a fresh theme object per call — React treats a
  // snapshot that changes between two reads with no change in between as a
  // bug and re-renders without end.
  const store = useMemo(() => {
    const readName = (): string =>
      typeof (provider as unknown as Record<string, (...args: unknown[]) => string>)
        .getThemeName === 'function'
        ? (provider as unknown as Record<string, (...args: unknown[]) => string>).getThemeName()
        : provider.getTheme().name
    let theme = provider.getTheme()
    let name = readName()
    return {
      subscribe: (onChange: () => void): (() => void) => {
        theme = provider.getTheme()
        name = readName()
        return subscribeToThemeProvider(provider, () => {
          theme = provider.getTheme()
          name = readName()
          onChange()
        })
      },
      getTheme: (): Theme => theme,
      getName: (): string => name,
    }
  }, [provider])
  // On the server, and on the client WHILE HYDRATING, React reads the server
  // snapshot instead of the live one — the theme the markup was rendered with
  // (`getServerTheme()`, when the provider has one) — and re-renders with the
  // live theme right after. A client that restored a persisted choice or
  // follows the OS preference therefore renders the HTML it was sent first,
  // instead of a mismatch React resolves by throwing that HTML away.
  const theme = useSyncExternalStore<Theme>(
    store.subscribe,
    store.getTheme,
    () => provider.getServerTheme?.() ?? store.getTheme(),
  )
  const themeName = useSyncExternalStore<string>(
    store.subscribe,
    store.getName,
    () => provider.getServerTheme?.().name ?? store.getName(),
  )

  // Memoized action wrappers
  const setTheme = useCallback((name: string) => provider.setTheme(name), [provider])

  const toggleTheme = useCallback(() => {
    // Prefer the provider's purpose-built light/dark toggle. `toggleMode`
    // is a required `ThemeProvider` method and the semantically correct
    // action for a light/dark toggle — unlike `getThemes()`, which is
    // optional, so the index-cycle below silently no-ops for providers
    // that don't implement it. The index-cycle is kept only as a fallback
    // for non-conforming providers that predate `toggleMode`.
    if (typeof provider.toggleMode === 'function') {
      provider.toggleMode()
      return
    }
    const themes = provider.getThemes?.() ?? []
    if (themes.length === 0) return
    const currentName =
      typeof (provider as unknown as Record<string, (...args: unknown[]) => string>)
        .getThemeName === 'function'
        ? (provider as unknown as Record<string, (...args: unknown[]) => string>).getThemeName()
        : provider.getTheme().name
    const currentIndex = themes.findIndex((t: Theme | string) =>
      typeof t === 'string' ? t === currentName : t.name === currentName,
    )
    const nextIndex = (currentIndex + 1) % themes.length
    const next = themes[nextIndex]
    provider.setTheme(typeof next === 'string' ? next : (next as Theme).name)
  }, [provider])

  return {
    theme,
    themeName,
    setTheme,
    toggleTheme,
    mode: theme.mode,
  }
}

/**
 * Hook to get just the current theme object.
 *
 * @returns The current theme
 */
export function useCurrentTheme(): Theme {
  const { theme } = useTheme()
  return theme
}

/**
 * Hook to get just the theme mode (light/dark).
 *
 * @returns The current theme mode
 */
export function useThemeMode(): 'light' | 'dark' {
  const { mode } = useTheme()
  return mode
}

/**
 * Hook to get theme colors.
 *
 * @returns The current theme colors
 */
export function useThemeColors(): Theme['colors'] {
  const { theme } = useTheme()
  return theme.colors
}
