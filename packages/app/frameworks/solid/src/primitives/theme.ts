/**
 * Solid.js primitives for theming.
 *
 * @module
 */

import { type Accessor, createEffect, createSignal, onCleanup } from 'solid-js'

import type { Theme, ThemeColors, ThemeProvider } from '@molecule/app-theme'

import { getThemeProvider } from '../context.js'
import type { ThemePrimitives } from '../types.js'

/**
 * Create theme primitives for theme state and actions.
 *
 *
 * @example
 * ```tsx
 * import { createTheme } from '`@molecule/app-solid`'
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
