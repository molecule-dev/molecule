/**
 * Vue composable for theming.
 *
 * @module
 */

import { computed, type ComputedRef, inject, onMounted, onUnmounted, ref } from 'vue'

import type { Theme, ThemeColors, ThemeProvider } from '@molecule/app-theme'

import { ThemeKey } from '../injection-keys.js'
import type { UseThemeReturn } from '../types.js'

/**
 * Composable to access the theme provider from injection.
 *
 * @returns The theme provider
 * @throws {Error} Error if used without providing theme
 */
export function useThemeProvider(): ThemeProvider {
  const provider = inject(ThemeKey)
  if (!provider) {
    throw new Error('useThemeProvider requires ThemeProvider to be provided')
  }
  return provider
}

/**
 * Composable for theme state and actions.
 *
 * @returns Theme state and actions
 *
 * @example
 * ```vue
 * <script setup>
 * import { useTheme } from '`@molecule/app-vue`'
 *
 * const { theme, themeName, setTheme, toggleTheme } = useTheme()
 * </script>
 *
 * <template>
 *   <div :style="{ background: theme.colors.background }">
 *     <p>Current theme: {{ themeName }}</p>
 *     <button @click="toggleTheme">Toggle Theme</button>
 *   </div>
 * </template>
 * ```
 */
export function useTheme(): UseThemeReturn {
  const provider = useThemeProvider()

  // Reactive state
  const currentTheme = ref<Theme>(provider.getTheme())
  const currentThemeName = ref<string>(provider.getTheme().name)

  // Subscribe to theme changes
  let unsubscribe: (() => void) | null = null

  onMounted(() => {
    unsubscribe = provider.subscribe(() => {
      currentTheme.value = provider.getTheme()
      currentThemeName.value = provider.getTheme().name
    })
  })

  onUnmounted(() => {
    unsubscribe?.()
  })

  // Computed properties
  const theme = computed(() => currentTheme.value)
  const themeName = computed(() => currentThemeName.value)
  const mode = computed(() => currentTheme.value.mode)

  // Actions
  const setTheme = (name: string): void => provider.setTheme(name)

  const toggleTheme = (): void => {
    const themes = provider.getThemes?.() ?? []
    const currentIndex = themes.findIndex((t) => t.name === currentThemeName.value)
    const nextIndex = (currentIndex + 1) % themes.length
    provider.setTheme(themes[nextIndex])
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
 * Composable to get just the current theme.
 *
 * @returns Computed theme reference
 */
export function useCurrentTheme(): ComputedRef<Theme> {
  const { theme } = useTheme()
  return theme
}

/**
 * Composable to get just the theme mode.
 *
 * @returns Computed mode reference
 */
export function useThemeMode(): ComputedRef<'light' | 'dark'> {
  const { mode } = useTheme()
  return mode
}

/**
 * Composable to get the current theme colors.
 *
 * @returns Computed colors reference
 *
 * @example
 * ```vue
 * <script setup>
 * import { useThemeColors } from '`@molecule/app-vue`'
 *
 * const colors = useThemeColors()
 * </script>
 *
 * <template>
 *   <div :style="{ color: colors.text, background: colors.background }">
 *     Themed content
 *   </div>
 * </template>
 * ```
 */
export function useThemeColors(): ComputedRef<ThemeColors> {
  const { theme } = useTheme()
  return computed(() => theme.value.colors)
}
