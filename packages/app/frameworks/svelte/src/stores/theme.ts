/**
 * Svelte stores for theming.
 *
 * @module
 */

import { derived, type Readable, readable } from 'svelte/store'

import type { Theme, ThemeProvider } from '@molecule/app-theme'

import { getThemeProvider } from '../context.js'

/**
 * Theme stores and actions.
 */
interface ThemeStores {
  theme: Readable<Theme>
  themeName: Readable<string>
  mode: Readable<Theme['mode']>
  themes: Theme[]
  setTheme: (name: string) => void
  toggleTheme: () => void
}

/**
 * Create theme stores from the theme provider in context.
 *
 * @returns Theme stores and actions
 *
 * @example
 * ```svelte
 * <script>
 *   import { createThemeStores } from '`@molecule/app-svelte`'
 *
 *   const { theme, themeName, mode, setTheme, toggleTheme } = createThemeStores()
 * </script>
 *
 * <div style:background={$theme.colors.background}>
 *   <p>Theme: {$themeName}</p>
 *   <button on:click={toggleTheme}>Toggle ({$mode})</button>
 * </div>
 * ```
 */
export function createThemeStores(): ThemeStores & { colors: Readable<Theme['colors']> } {
  const provider = getThemeProvider()

  // Main theme store
  const theme: Readable<Theme> = readable(provider.getTheme(), (set: (value: Theme) => void) => {
    return provider.subscribe(() => {
      set(provider.getTheme())
    })
  })

  // Theme name store
  const themeName: Readable<string> = readable(
    provider.getTheme().name,
    (set: (value: string) => void) => {
      return provider.subscribe(() => {
        set(provider.getTheme().name)
      })
    },
  )

  // Derived stores
  const mode = derived(theme, ($theme: Theme) => $theme.mode)
  const colors = derived(theme, ($theme: Theme) => $theme.colors)

  // Get available themes
  const themes = provider.getThemes?.() ?? []

  // Actions
  const setTheme = (name: string): void => {
    provider.setTheme(name)
  }

  const toggleTheme = (): void => {
    const currentName = provider.getTheme().name
    const currentIndex = themes.findIndex((t: Theme) => t.name === currentName)
    const nextIndex = (currentIndex + 1) % themes.length
    provider.setTheme(themes[nextIndex])
  }

  return {
    theme,
    themeName,
    mode,
    colors,
    themes,
    setTheme,
    toggleTheme,
  }
}

/**
 * Create a derived store that returns just the theme colors.
 *
 * @param theme - A readable theme store (from createThemeStores or createThemeStoresFromProvider)
 * @returns Readable store of theme colors
 *
 * @example
 * ```svelte
 * <script>
 *   import { createThemeStores, createThemeColorsStore } from '`@molecule/app-svelte`'
 *
 *   const { theme } = createThemeStores()
 *   const colors = createThemeColorsStore(theme)
 * </script>
 *
 * <div style:color={$colors.text.primary}>Hello</div>
 * ```
 */
export function createThemeColorsStore(theme: Readable<Theme>): Readable<Theme['colors']> {
  return derived(theme, ($theme: Theme) => $theme.colors)
}

/**
 * Create theme stores from a specific theme provider.
 *
 * @param provider - Theme provider
 * @returns Theme stores and actions
 */
export function createThemeStoresFromProvider(provider: ThemeProvider): ThemeStores {
  const theme: Readable<Theme> = readable(provider.getTheme(), (set: (value: Theme) => void) => {
    return provider.subscribe(() => {
      set(provider.getTheme())
    })
  })

  const themeName: Readable<string> = readable(
    provider.getTheme().name,
    (set: (value: string) => void) => {
      return provider.subscribe(() => {
        set(provider.getTheme().name)
      })
    },
  )

  const mode = derived(theme, ($theme: Theme) => $theme.mode)
  const themes = provider.getThemes?.() ?? []

  return {
    theme,
    themeName,
    mode,
    themes,
    setTheme: (name: string) => provider.setTheme(name),
    toggleTheme: () => {
      const currentName = provider.getTheme().name
      const idx = themes.findIndex((t: Theme) => t.name === currentName)
      provider.setTheme(themes[(idx + 1) % themes.length])
    },
  }
}
