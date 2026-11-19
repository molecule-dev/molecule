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

/** The subscription method a provider written before `subscribe` still carries. */
interface LegacyThemeSubscription {
  onThemeChange(callback: () => void): () => void
}

/** The name accessor a provider written before `Theme.name` still carries. */
interface NamedThemeProvider {
  getThemeName(): string
}

/**
 * Whether a provider still offers the pre-`subscribe` change listener.
 *
 * @param provider - The theme provider.
 * @returns `true` when it has `onThemeChange`.
 */
function hasOnThemeChange(
  provider: ThemeProvider,
): provider is ThemeProvider & LegacyThemeSubscription {
  return 'onThemeChange' in provider && typeof provider.onThemeChange === 'function'
}

/**
 * Whether a provider still offers its theme name separately.
 *
 * @param provider - The theme provider.
 * @returns `true` when it has `getThemeName()`.
 */
function hasThemeName(provider: ThemeProvider): provider is ThemeProvider & NamedThemeProvider {
  return 'getThemeName' in provider && typeof provider.getThemeName === 'function'
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
    // A listener that takes no argument fits a one-argument callback.
    return provider.subscribe(callback)
  }
  if (hasOnThemeChange(provider)) {
    return provider.onThemeChange(callback)
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
  return hasThemeName(provider) ? provider.getThemeName() : provider.getTheme().name
}

/**
 * Composable for theme state and actions.
 *
 * A server render and the hydrating client's first render both read the
 * provider's `getServerTheme()` when it has one, so the markup stays the same;
 * the mounted hook then switches to the live `getTheme()`. A provider whose
 * theme cannot differ between server and client need not implement it.
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

  // A render with no browser (a server or build-time render) has no storage and
  // no OS preference, and the hydrating client's FIRST render is the markup the
  // server sent. Both read `getServerTheme()` (when the provider has one) so the
  // markup matches; the mounted hook below then switches to the live theme.
  // This is React's `useSyncExternalStore` server snapshot in Vue's terms.
  const serverTheme = provider.getServerTheme?.()

  // Reactive state
  const currentTheme = ref<Theme>(serverTheme ?? provider.getTheme())
  const currentThemeName = ref<string>(serverTheme ? serverTheme.name : readThemeName(provider))

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
    provider.setTheme(typeof next === 'string' ? next : next.name)
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
