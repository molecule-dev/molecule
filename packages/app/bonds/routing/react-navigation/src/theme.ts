/**
 * React Navigation theme built from the active molecule theme, so navigator
 * headers, tab bars and screen backgrounds (which are not ClassMap classes)
 * follow light, dark and custom themes.
 *
 * @module
 */

import { useMemo, useSyncExternalStore } from 'react'

import {
  getProvider as getThemeProvider,
  type Theme,
  type ThemeProvider,
} from '@molecule/app-theme'

/**
 * The colours React Navigation reads from its theme (`Theme['colors']` in
 * `@react-navigation/native`).
 */
export interface NavigationThemeColors {
  /** Active tint: the back button, the selected tab. */
  primary: string
  /** Screen background. */
  background: string
  /** Header and tab bar background. */
  card: string
  /** Header title and tab label text. */
  text: string
  /** Header and tab bar borders. */
  border: string
  /** Tab badges. */
  notification: string
}

/**
 * The part of a React Navigation theme this module sets. `DefaultTheme` and
 * `DarkTheme` from `@react-navigation/native` satisfy it, fonts included.
 */
export interface NavigationTheme {
  /** Whether the theme is dark (status bar and system UI follow it). */
  dark: boolean
  /** The theme's colours. */
  colors: NavigationThemeColors
}

/**
 * The React Navigation themes the molecule theme's colours are laid over: each
 * mode's fonts and any colours this module does not set come from its base.
 */
export interface NavigationThemeBases<T extends NavigationTheme> {
  /** The base for a light molecule theme, usually `DefaultTheme`. */
  light: T
  /** The base for a dark molecule theme, usually `DarkTheme`. */
  dark: T
}

/**
 * Builds a React Navigation theme from a molecule theme.
 *
 * Colours map as: `primary` → `primary`, `background` → `background`,
 * `surface` → `card`, `text` → `text`, `border` → `border`, `error` →
 * `notification`; `dark` follows the theme's `mode`.
 *
 * @param theme - The molecule theme.
 * @param bases - The React Navigation themes to start from (fonts come from them).
 * @returns The React Navigation theme.
 */
export function toNavigationTheme<T extends NavigationTheme>(
  theme: Theme,
  bases: NavigationThemeBases<T>,
): T {
  const dark = theme.mode === 'dark'
  const base = dark ? bases.dark : bases.light
  const { colors } = theme
  return {
    ...base,
    dark,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.error,
    },
  }
}

/** A theme provider read as an external store, for `useSyncExternalStore`. */
export interface ThemeStore {
  /** Calls the listener after each theme change; returns the unsubscribe function. */
  subscribe(listener: () => void): () => void
  /** The active theme as of the last change. */
  getSnapshot(): Theme
}

/** One store per provider, so every component reads the same snapshot. */
const stores = new WeakMap<ThemeProvider, ThemeStore>()

/**
 * The store for a theme provider. Its snapshot changes only when the provider
 * announces a change, so a provider that builds a new theme object on each
 * `getTheme()` call does not re-render without end.
 *
 * @param provider - The bonded theme provider.
 * @returns The store.
 */
export function themeStore(provider: ThemeProvider): ThemeStore {
  const existing = stores.get(provider)
  if (existing) return existing
  let snapshot = provider.getTheme()
  const store: ThemeStore = {
    subscribe(listener) {
      return provider.subscribe((theme) => {
        snapshot = theme
        listener()
      })
    },
    getSnapshot: () => snapshot,
  }
  stores.set(provider, store)
  return store
}

/** Used when no theme provider is bonded: nothing ever changes. */
const noSubscription = (): (() => void) => () => undefined

/**
 * The React Navigation theme for the active molecule theme, updated whenever the
 * theme changes (a person's choice, the device's appearance setting, a restored
 * saved theme). Pass it to `<NavigationContainer theme={…}>`.
 *
 * With no `@molecule/app-theme` provider bonded it returns `bases.light`.
 *
 * @example
 * ```tsx
 * import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native'
 * import { useNavigationTheme } from '@molecule/app-routing-react-navigation'
 *
 * const navigationThemes = { light: DefaultTheme, dark: DarkTheme }
 *
 * export function App() {
 *   const theme = useNavigationTheme(navigationThemes)
 *   return <NavigationContainer theme={theme}>{…}</NavigationContainer>
 * }
 * ```
 * @param bases - The React Navigation themes to start from; keep the object
 *   stable (define it outside the component) so the theme is rebuilt only on a change.
 * @returns The React Navigation theme.
 */
export function useNavigationTheme<T extends NavigationTheme>(bases: NavigationThemeBases<T>): T {
  const provider = getThemeProvider()
  const store = provider ? themeStore(provider) : undefined
  const theme = useSyncExternalStore(
    store ? store.subscribe : noSubscription,
    () => store?.getSnapshot(),
    () => store?.getSnapshot(),
  )
  return useMemo(() => (theme ? toNavigationTheme(theme, bases) : bases.light), [theme, bases])
}
