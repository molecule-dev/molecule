/**
 * React hook for theming.
 *
 * @module
 */

import { useCallback, useContext, useRef, useSyncExternalStore } from 'react'

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

/** A provider that also exposes `onThemeChange`, the subscription some providers offer besides `subscribe`. */
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
 * @param provider - The provider to inspect.
 * @returns `true` when `provider.onThemeChange` is a function.
 */
function hasThemeChange(provider: ThemeProvider): provider is ThemeProvider & ThemeChangeSource {
  return 'onThemeChange' in provider && typeof provider.onThemeChange === 'function'
}

/**
 * Whether the provider has a `getThemeName` method.
 * @param provider - The provider to inspect.
 * @returns `true` when `provider.getThemeName` is a function.
 */
function hasThemeName(provider: ThemeProvider): provider is ThemeProvider & ThemeNameSource {
  return 'getThemeName' in provider && typeof provider.getThemeName === 'function'
}

/**
 * Subscribe to a theme provider, supporting both `subscribe` and `onThemeChange` methods.
 * @param provider - The ThemeProvider instance to subscribe to.
 * @param callback - Listener invoked whenever the active theme changes.
 * @returns An unsubscribe function that removes the listener.
 */
function subscribeToThemeProvider(provider: ThemeProvider, callback: () => void): () => void {
  if (typeof provider.subscribe === 'function') {
    return provider.subscribe(callback)
  }
  if (hasThemeChange(provider)) return provider.onThemeChange(callback)
  return () => {}
}

/**
 * The theme and its name as one snapshot, so both come from the same read.
 */
interface ThemeSnapshot {
  theme: Theme
  name: string
}

/**
 * Reads one snapshot of the provider's active theme. The name comes from
 * `getThemeName()` when the provider has it, from the theme object otherwise.
 * @param provider - The ThemeProvider to read.
 * @returns The active theme and its name.
 */
function readThemeSnapshot(provider: ThemeProvider): ThemeSnapshot {
  const theme = provider.getTheme()
  const name = hasThemeName(provider) ? provider.getThemeName() : theme.name
  return { theme, name }
}

/**
 * Whether two snapshots of one provider show the same theme.
 * @param a - The earlier snapshot.
 * @param b - The later snapshot.
 * @returns `true` when neither the theme nor its name changed.
 */
function sameTheme(a: ThemeSnapshot, b: ThemeSnapshot): boolean {
  return Object.is(a.theme, b.theme) && a.name === b.name
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
  // when the provider announces a change. Reading through a cached snapshot
  // (rather than calling `getTheme()` on every render) keeps the snapshot
  // stable for a provider that builds a fresh theme object per call — React
  // treats a snapshot that changes between two reads with no change in between
  // as a bug and re-renders without end.
  const clientCache = useRef<{ provider: ThemeProvider; snapshot: ThemeSnapshot } | null>(null)
  /** Re-reads the provider into the cache, keeping the snapshot when nothing changed. */
  const publish = useCallback((): void => {
    const cached = clientCache.current
    const snapshot = readThemeSnapshot(provider)
    if (cached && cached.provider === provider && sameTheme(cached.snapshot, snapshot)) return
    clientCache.current = { provider, snapshot }
  }, [provider])

  const getSnapshot = useCallback((): ThemeSnapshot => {
    const cached = clientCache.current
    if (cached && cached.provider === provider) return cached.snapshot
    const snapshot = readThemeSnapshot(provider)
    clientCache.current = { provider, snapshot }
    return snapshot
  }, [provider])

  const subscribe = useCallback(
    (onChange: () => void): (() => void) => {
      // Re-read on subscribing and on every announced change: a change made
      // between a render and the subscription sends no event React could see.
      publish()
      return subscribeToThemeProvider(provider, () => {
        publish()
        onChange()
      })
    },
    [provider, publish],
  )

  // On the server, and on the client WHILE HYDRATING, React reads the server
  // snapshot instead of the live one — the theme the markup was rendered with
  // (`getServerTheme()`, when the provider has one) — and re-renders with the
  // live theme right after. A client that restored a persisted choice or
  // follows the OS preference therefore renders the HTML it was sent first,
  // instead of a mismatch React resolves by throwing that HTML away.
  const serverCache = useRef<{ provider: ThemeProvider; snapshot: ThemeSnapshot } | null>(null)
  const getServerSnapshot = useCallback((): ThemeSnapshot => {
    const cached = serverCache.current
    if (cached && cached.provider === provider) return cached.snapshot
    const theme = provider.getServerTheme?.() ?? getSnapshot().theme
    const snapshot = { theme, name: theme.name }
    serverCache.current = { provider, snapshot }
    return snapshot
  }, [provider, getSnapshot])

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const theme = snapshot.theme
  const themeName = snapshot.name

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
    const currentName = hasThemeName(provider) ? provider.getThemeName() : provider.getTheme().name
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
