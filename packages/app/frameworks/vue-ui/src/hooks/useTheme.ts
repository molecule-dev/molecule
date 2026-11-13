/**
 * Internal theme composable mirroring `@molecule/app-react`'s `useTheme`
 * semantics exactly (the package is not allowed to depend on app-vue's
 * composable, whose toggle cycles `getThemes()` via `setTheme` — a different
 * service call than React's `toggleMode`-first behavior).
 *
 * @module
 */

import { computed, type ComputedRef, inject, onMounted, onUnmounted, type Ref, ref } from 'vue'

import type { Theme, ThemeProvider } from '@molecule/app-theme'
import { ThemeKey } from '@molecule/app-vue'

/**
 * Accesses the theme provider from injection.
 *
 * @returns The theme provider.
 * @throws {Error} When no theme provider was installed.
 */
export function useThemeProvider(): ThemeProvider {
  const provider = inject(ThemeKey)
  if (!provider) {
    throw new Error('useTheme must be used within a theme provider')
  }
  return provider
}

/** What {@link useTheme} returns. */
export interface UseThemeResult {
  /** The current theme, kept current via the provider's subscription. */
  theme: Ref<Theme>
  /** The current theme's name. */
  themeName: ComputedRef<string>
  /** The current theme's mode (`light` / `dark`). */
  mode: ComputedRef<'light' | 'dark'>
  /** Sets the theme by name. */
  setTheme: (name: string) => void
  /** Toggles light/dark, preferring the provider's `toggleMode`. */
  toggleTheme: () => void
}

/**
 * Theme state and actions with `@molecule/app-react`'s `useTheme` semantics.
 *
 * @returns Theme state and actions.
 */
export function useTheme(): UseThemeResult {
  const provider = useThemeProvider()

  const theme = ref<Theme>(provider.getTheme())
  let unsubscribe: (() => void) | null = null
  onMounted(() => {
    unsubscribe = provider.subscribe(() => {
      theme.value = provider.getTheme()
    })
  })
  onUnmounted(() => {
    unsubscribe?.()
  })

  const setTheme = (name: string): void => {
    provider.setTheme(name)
  }

  const toggleTheme = (): void => {
    // Prefer the provider's purpose-built light/dark toggle, exactly like
    // React's useTheme; the getThemes() cycle is only a fallback for
    // providers that predate toggleMode.
    if (typeof provider.toggleMode === 'function') {
      provider.toggleMode()
      return
    }
    const themes = provider.getThemes?.() ?? []
    if (themes.length === 0) return
    const currentName = theme.value.name
    const currentIndex = themes.findIndex((t) =>
      typeof t === 'string' ? t === currentName : t.name === currentName,
    )
    const nextIndex = (currentIndex + 1) % themes.length
    const next = themes[nextIndex]
    provider.setTheme(typeof next === 'string' ? next : next.name)
  }

  return {
    theme,
    themeName: computed(() => theme.value.name),
    mode: computed(() => theme.value.mode),
    setTheme,
    toggleTheme,
  }
}
