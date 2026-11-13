/**
 * Vue composable for theming.
 *
 * @module
 */

import { computed, type ComputedRef, inject, onMounted, onUnmounted, ref } from 'vue'

import { t } from '@molecule/app-i18n'
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
    throw new Error(
      t('vue.error.useThemeOutsideProvider', undefined, {
        defaultValue: 'useThemeProvider must be used within a ThemeProvider',
      }),
    )
  }
  return provider
}

/**
 * Subscribe to a theme provider, supporting both `subscribe` and the legacy
 * `onThemeChange` methods.
 *
 * @param provider - The theme provider instance to subscribe to.
 * @param callback - Listener invoked whenever the active theme changes.
 * @returns An unsubscribe function that removes the listener.
 */
function subscribeToThemeProvider(provider: ThemeProvider, callback: () => void): () => void {
  if (typeof provider.subscribe === 'function') {
    return provider.subscribe(callback as unknown as (theme: Theme) => void)
  }
  const legacy = (provider as unknown as Record<string, (...args: unknown[]) => unknown>)
    .onThemeChange
  if (typeof legacy === 'function') {
    return (
      provider as unknown as Record<string, (...args: unknown[]) => () => void>
    ).onThemeChange(callback)
  }
  return () => {}
}

/**
 * The provider's current theme NAME, read through `getThemeName()` when the
 * provider has one and `getTheme().name` otherwise.
 *
 * @param provider - The theme provider.
 * @returns The active theme's name.
 */
function readThemeName(provider: ThemeProvider): string {
  const byName = (provider as unknown as Record<string, (...args: unknown[]) => string>)
    .getThemeName
  return typeof byName === 'function' ? byName.call(provider) : provider.getTheme().name
}

/**
 * Composable for theme state and actions.
 *
 * @returns Theme state and actions
 *
 * @example
 * ```vue
 * <script setup>
 * import { useTheme } from '@molecule/app-vue'
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
  const currentThemeName = ref<string>(readThemeName(provider))

  // Subscribe to theme changes
  let unsubscribe: (() => void) | null = null

  onMounted(() => {
    unsubscribe = subscribeToThemeProvider(provider, () => {
      currentTheme.value = provider.getTheme()
      currentThemeName.value = readThemeName(provider)
    })
    // A theme change between setup and mount sends no notification this
    // subscription could see — reconcile it now.
    currentTheme.value = provider.getTheme()
    currentThemeName.value = readThemeName(provider)
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
    // Prefer the provider's purpose-built light/dark toggle. `toggleMode` is a
    // required `ThemeProvider` method and the semantically correct action for a
    // light/dark toggle — unlike `getThemes()`, which is optional, so the
    // index-cycle below silently no-ops for providers that don't implement it.
    // The index-cycle is kept only as a fallback for non-conforming providers
    // that predate `toggleMode`.
    if (typeof provider.toggleMode === 'function') {
      provider.toggleMode()
      return
    }
    const themes = provider.getThemes?.() ?? []
    if (themes.length === 0) return
    const currentName = readThemeName(provider)
    const currentIndex = themes.findIndex((entry) =>
      typeof entry === 'string' ? entry === currentName : entry.name === currentName,
    )
    const next = themes[(currentIndex + 1) % themes.length]
    provider.setTheme(typeof next === 'string' ? next : (next as Theme).name)
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
 * import { useThemeColors } from '@molecule/app-vue'
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
