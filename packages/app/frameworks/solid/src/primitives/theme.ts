/**
 * Solid.js primitives for theming.
 *
 * @module
 */

import { type Accessor, createEffect, createSignal, onCleanup, useContext } from 'solid-js'

import { t } from '@molecule/app-i18n'
import type { Theme, ThemeColors, ThemeProvider } from '@molecule/app-theme'

import { getThemeProvider, ThemeContext } from '../context.js'
import type { ThemePrimitives } from '../types.js'

/**
 * The theme provider from the nearest `MoleculeProvider` (`config.theme`),
 * under React's hook name.
 *
 * @returns The theme provider instance.
 * @throws {Error} When no `MoleculeProvider` above configures `theme`.
 */
export function useThemeProvider(): ThemeProvider {
  const provider = useContext(ThemeContext)
  if (!provider) {
    throw new Error(
      t('solid.error.useThemeOutsideProvider', undefined, {
        defaultValue: 'useThemeProvider must be used within a ThemeProvider',
      }),
    )
  }
  return provider
}

/**
 * Subscribe to a theme provider, supporting both `subscribe` and
 * `onThemeChange` methods.
 *
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
 * What {@link useTheme} returns: the theme fields as accessors and the
 * actions as plain functions (the same names React's `useTheme` returns).
 */
export interface UseThemeResult {
  /** The current theme as an accessor. */
  theme: Accessor<Theme>
  /** The current theme's name as an accessor. */
  themeName: Accessor<string>
  /** Sets the theme by name. */
  setTheme: (name: string) => void
  /** Toggles light/dark through the provider's `toggleMode`. */
  toggleTheme: () => void
  /** The current mode as an accessor. */
  mode: Accessor<'light' | 'dark'>
}

/**
 * Theme state and actions, under React's hook name.
 *
 * @returns Theme fields as accessors and the actions.
 * @throws {Error} When no `MoleculeProvider` above configures `theme`.
 * @example
 * ```tsx
 * const { theme, themeName, setTheme, toggleTheme } = useTheme()
 * <button onClick={toggleTheme}>Current theme: {themeName()}</button>
 * ```
 */
export function useTheme(): UseThemeResult {
  const provider = useThemeProvider()

  const [theme, setThemeSignal] = createSignal<Theme>(provider.getTheme())
  const unsubscribe = subscribeToThemeProvider(provider, () => {
    setThemeSignal(provider.getTheme())
  })
  onCleanup(unsubscribe)

  const setTheme = (name: string): void => {
    provider.setTheme(name)
  }

  // Prefer the provider's purpose-built light/dark toggle; the index cycle is
  // the fallback for providers that predate `toggleMode` (React does the same).
  const toggleTheme = (): void => {
    if (typeof provider.toggleMode === 'function') {
      provider.toggleMode()
      return
    }
    const themes = provider.getThemes?.() ?? []
    if (themes.length === 0) return
    const currentName = provider.getTheme().name
    const currentIndex = themes.findIndex((candidate: Theme | string) =>
      typeof candidate === 'string' ? candidate === currentName : candidate.name === currentName,
    )
    const nextIndex = (currentIndex + 1) % themes.length
    const next = themes[nextIndex]
    provider.setTheme(typeof next === 'string' ? next : (next as Theme).name)
  }

  return {
    theme,
    themeName: () => theme().name,
    setTheme,
    toggleTheme,
    mode: () => theme().mode,
  }
}

/**
 * The whole current theme object, under React's hook name.
 *
 * @returns Accessor for the current theme.
 * @throws {Error} When no `MoleculeProvider` above configures `theme`.
 */
export function useCurrentTheme(): Accessor<Theme> {
  const { theme } = useTheme()
  return theme
}

/**
 * The theme mode (light/dark), under React's hook name.
 *
 * @returns Accessor for the current mode.
 * @throws {Error} When no `MoleculeProvider` above configures `theme`.
 */
export function useThemeMode(): Accessor<'light' | 'dark'> {
  const { mode } = useTheme()
  return mode
}

/**
 * The current theme's color palette, under React's hook name.
 *
 * @returns Accessor for the current theme's colors.
 * @throws {Error} When no `MoleculeProvider` above configures `theme`.
 */
export function useThemeColors(): Accessor<ThemeColors> {
  const { theme } = useTheme()
  return () => theme().colors
}

/**
 * Create theme primitives for theme state and actions.
 *
 *
 * @example
 * ```tsx
 * import { createTheme } from '@molecule/app-solid'
 *
 * function ThemeToggle() {
 *   const { mode, toggleTheme } = createTheme()
 *
 *   return (
 *     <button onClick={toggleTheme}>
 *       Current: {mode()} - Click to toggle
 *     </button>
 *   )
 * }
 * ```
 * @returns The created instance.
 */
export function createTheme(): ThemePrimitives {
  const provider = getThemeProvider()

  const [theme, setThemeSignal] = createSignal<Theme>(provider.getTheme())

  // Subscribe to theme changes
  createEffect(() => {
    const unsubscribe = provider.subscribe((newTheme: Theme) => {
      setThemeSignal(newTheme)
    })

    onCleanup(unsubscribe)
  })

  const themeName: Accessor<string> = () => theme().name
  const mode: Accessor<'light' | 'dark'> = () => theme().mode

  const setTheme = (name: string): void => {
    provider.setTheme(name)
  }

  const toggleTheme = (): void => {
    provider.toggleMode()
  }

  return {
    theme,
    themeName,
    mode,
    setTheme,
    toggleTheme,
  }
}

/**
 * Create a mode accessor.
 *
 * @returns Accessor for current mode
 *
 * @example
 * ```tsx
 * function ModeIndicator() {
 *   const mode = useMode()
 *   return <div class={mode() === 'dark' ? 'dark-mode' : 'light-mode'}>...</div>
 * }
 * ```
 */
export function useMode(): Accessor<'light' | 'dark'> {
  const { mode } = createTheme()
  return mode
}

/**
 * Create a theme name accessor.
 *
 * @returns Accessor for current theme name
 */
export function useThemeName(): Accessor<string> {
  const { themeName } = createTheme()
  return themeName
}

/**
 * Create theme helpers from context.
 *
 * @returns Theme helper functions
 */

/**
 * Creates a theme helpers.
 * @returns The created result.
 */
export function createThemeHelpers(): {
  getTheme: () => Theme
  setTheme: (name: string) => void
  getMode: () => 'light' | 'dark'
  toggleMode: () => void
  getAvailableThemes: () => Theme[]
} {
  const provider = getThemeProvider()

  return {
    getTheme: () => provider.getTheme(),
    setTheme: (name: string) => provider.setTheme(name),
    getMode: () => provider.getTheme().mode,
    toggleMode: () => provider.toggleMode(),
    getAvailableThemes: () => provider.getThemes?.() ?? [],
  }
}

/**
 * Create theme primitives from a specific provider.
 *
 * @param provider - Theme provider
 * @returns Theme primitives
 */
export function createThemeFromProvider(provider: ThemeProvider): ThemePrimitives {
  const [theme, setThemeSignal] = createSignal<Theme>(provider.getTheme())

  createEffect(() => {
    const unsubscribe = provider.subscribe((newTheme: Theme) => {
      setThemeSignal(newTheme)
    })

    onCleanup(unsubscribe)
  })

  return {
    theme,
    themeName: () => theme().name,
    mode: () => theme().mode,
    setTheme: (name: string) => provider.setTheme(name),
    toggleTheme: () => provider.toggleMode(),
  }
}

/**
 * Create a colors accessor derived from a theme accessor.
 *
 * @param theme - Theme accessor (e.g. from createTheme().theme)
 * @returns Accessor for the current theme colors
 *
 * @example
 * ```tsx
 * function ColorSwatch() {
 *   const { theme } = createTheme()
 *   const colors = createThemeColors(theme)
 *
 *   return (
 *     <div style={{ background: colors().background, color: colors().text }}>
 *       Primary: {colors().primary}
 *     </div>
 *   )
 * }
 * ```
 */
export function createThemeColors(theme: Accessor<Theme>): Accessor<ThemeColors> {
  return () => theme().colors
}

/**
 * Apply theme CSS variables to document.
 *
 * @deprecated The theme bond (e.g. `@molecule/app-theme-css-variables`) owns
 * document styling; this duplicates it. React's bindings never touch the
 * document — drive the theme provider (`useTheme`) and let the bond style.
 * @example
 * ```tsx
 * function App() {
 *   applyThemeToDocument()
 *   return <MyApp />
 * }
 * ```
 */
export function applyThemeToDocument(): void {
  const { theme } = createTheme()

  createEffect(() => {
    const currentTheme = theme()
    const root = document.documentElement

    // Apply colors
    if (currentTheme.colors) {
      Object.entries(currentTheme.colors).forEach(([key, value]) => {
        root.style.setProperty(`--color-${key}`, value as string)
      })
    }

    // Apply spacing
    if (currentTheme.spacing) {
      Object.entries(currentTheme.spacing).forEach(([key, value]) => {
        root.style.setProperty(`--spacing-${key}`, value as string)
      })
    }

    // Apply typography
    if (currentTheme.typography) {
      Object.entries(currentTheme.typography).forEach(([key, value]) => {
        if (typeof value === 'object') {
          Object.entries(value).forEach(([prop, val]) => {
            root.style.setProperty(`--typography-${key}-${prop}`, val as string)
          })
        }
      })
    }

    // Set mode class
    root.classList.remove('light', 'dark')
    root.classList.add(currentTheme.mode)
  })
}
