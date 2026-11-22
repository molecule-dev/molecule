/**
 * A real `ThemeProvider` over `@molecule/app-theme`'s base themes, for tests.
 *
 * The suites used to hand-roll a `Theme` fixture per test file whose shape
 * drifted from `@molecule/app-theme`'s `Theme` contract (nested color groups,
 * empty scale objects). Building on the package's own `lightTheme`/`darkTheme`
 * keeps every fixture bound to the real contract, and the provider behaves
 * like a bonded one: switching notifies subscribers, so components that
 * re-render on theme changes do so under test too.
 *
 * @module
 */

import type { Theme, ThemeProvider } from '@molecule/app-theme'
import { darkTheme, lightTheme } from '@molecule/app-theme'

/**
 * A working in-memory `ThemeProvider` over the base light and dark themes.
 *
 * @param name - Which base theme starts active ('light' by default).
 * @returns A provider whose `setTheme`/`toggleMode` switch between
 * `lightTheme` and `darkTheme` and notify `subscribe` listeners.
 */
export function buildThemeProvider(name: 'light' | 'dark' = 'light'): ThemeProvider {
  let active: Theme = name === 'dark' ? darkTheme : lightTheme
  const listeners = new Set<(theme: Theme) => void>()
  const activate = (next: Theme): void => {
    if (next === active) return
    active = next
    for (const listener of listeners) listener(active)
  }
  return {
    getTheme: () => active,
    setTheme: (theme) => {
      const next =
        typeof theme === 'string'
          ? [lightTheme, darkTheme].find((candidate) => candidate.name === theme)
          : theme
      if (next) activate(next)
    },
    toggleMode: () => activate(active.mode === 'light' ? darkTheme : lightTheme),
    subscribe: (callback) => {
      listeners.add(callback)
      return () => {
        listeners.delete(callback)
      }
    },
    getThemes: () => [lightTheme, darkTheme],
  }
}
