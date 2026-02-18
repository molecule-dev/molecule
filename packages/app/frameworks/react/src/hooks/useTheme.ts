/**
 * React hook for theming.
 *
 * @module
 */

import { useCallback, useContext, useEffect, useState } from 'react'

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

  const [theme, setThemeState] = useState<Theme>(() => provider.getTheme())
  const [themeName, setThemeName] = useState<string>(() => {
    return typeof (provider as unknown as Record<string, (...args: unknown[]) => string>)
      .getThemeName === 'function'
      ? (provider as unknown as Record<string, (...args: unknown[]) => string>).getThemeName()
      : provider.getTheme().name
  })

  useEffect(() => {
    const unsubscribe = subscribeToThemeProvider(provider, () => {
      setThemeState(provider.getTheme())
      setThemeName(
        typeof (provider as unknown as Record<string, (...args: unknown[]) => string>)
          .getThemeName === 'function'
          ? (provider as unknown as Record<string, (...args: unknown[]) => string>).getThemeName()
          : provider.getTheme().name,
      )
    })
    return unsubscribe
  }, [provider])

  // Memoized action wrappers
  const setTheme = useCallback((name: string) => provider.setTheme(name), [provider])

  const toggleTheme = useCallback(() => {
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
