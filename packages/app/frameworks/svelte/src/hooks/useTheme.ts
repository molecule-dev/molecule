/**
 * Svelte hook for theming, porting React's `useTheme` family.
 *
 * @module
 */

import { onMount } from 'svelte'
import { derived, type Readable } from 'svelte/store'

import type { Theme, ThemeProvider } from '@molecule/app-theme'

import { useThemeProvider } from '../context.js'
import { fieldStore, liveStore } from './live-store.js'

/** What {@link useTheme} returns. */
export interface UseThemeResult {
  /** The current theme object. */
  theme: Readable<Theme>
  /** The current theme's name. */
  themeName: Readable<string>
  /** Switches the active theme by name. */
  setTheme: (name: string) => void
  /** Toggles light/dark (the provider's `toggleMode`, or an index cycle). */
  toggleTheme: () => void
  /** The current mode: 'light' or 'dark'. */
  mode: Readable<'light' | 'dark'>
}

/**
 * Subscribe to a theme provider, supporting both `subscribe` and the legacy
 * `onThemeChange` methods.
 *
 * @param provider - The theme provider to subscribe to.
 * @param callback - Listener invoked whenever the active theme changes.
 * @returns An unsubscribe function that removes the listener.
 */
function subscribeToThemeProvider(provider: ThemeProvider, callback: () => void): () => void {
  if (typeof provider.subscribe === 'function') {
    // A listener that takes no argument satisfies one that receives the theme.
    return provider.subscribe(callback)
  }
  // `onThemeChange` is not part of `ThemeProvider`; a provider that predates
  // `subscribe` may still expose it. Read it as an unknown function rather
  // than asserting the provider's shape.
  const legacy: unknown = Reflect.get(provider, 'onThemeChange')
  if (typeof legacy !== 'function') return () => {}
  const stop: unknown = legacy(callback)
  return typeof stop === 'function' ? () => stop() : () => {}
}

/**
 * The active theme's name. `getThemeName()` is not part of `ThemeProvider`;
 * probe it the way React does, so a provider that predates the theme object's
 * `name` still works.
 *
 * @param provider - The theme provider to read.
 * @returns The active theme's name.
 */
function readThemeName(provider: ThemeProvider): string {
  const named: unknown = Reflect.get(provider, 'getThemeName')
  if (typeof named === 'function') {
    const name: unknown = named()
    if (typeof name === 'string') return name
  }
  return provider.getTheme().name
}

/**
 * Theme state and actions, React's `useTheme` in Svelte's idiom: call it
 * during component init under `setMoleculeContext({ theme })`.
 *
 * @returns Theme state as stores and the actions as functions.
 * @example
 * ```svelte
 * <script>
 *   import { useTheme } from '@molecule/app-svelte'
 *   const { themeName, toggleTheme } = useTheme()
 * </script>
 *
 * <button onclick={toggleTheme}>Current theme: {$themeName}</button>
 * ```
 */
export function useTheme(): UseThemeResult {
  const provider = useThemeProvider()
  const readName = (): string => readThemeName(provider)
  const readTheme = (): { theme: Theme; name: string } => ({
    theme: provider.getTheme(),
    name: readName(),
  })
  // A static site prerenders on a server that reads no storage and no OS
  // preference, then hydrates in a browser that reads both. The first value is
  // the theme that markup was rendered with (`getServerTheme()` when the
  // provider has one), so hydration matches; the mount below switches to the
  // live theme, as React's binding does right after hydration. A server render
  // never mounts, so it keeps the server theme.
  const serverTheme = provider.getServerTheme?.()
  const state = liveStore(
    readTheme,
    (notify) => subscribeToThemeProvider(provider, notify),
    serverTheme === undefined ? undefined : { theme: serverTheme, name: serverTheme.name },
  )
  onMount(() => state.refresh())

  const toggleTheme = (): void => {
    // Prefer the provider's purpose-built light/dark toggle — unlike
    // `getThemes()`, which is optional, so the index-cycle below silently
    // no-ops for providers that don't implement it. The index-cycle is kept
    // only as a fallback for non-conforming providers that predate it.
    if (typeof provider.toggleMode === 'function') {
      provider.toggleMode()
      return
    }
    const themes = provider.getThemes?.() ?? []
    if (themes.length === 0) return
    const currentName = readName()
    const currentIndex = themes.findIndex((entry) => entry.name === currentName)
    const next = themes[(currentIndex + 1) % themes.length]
    provider.setTheme(next.name)
  }

  return {
    theme: fieldStore(state, 'theme'),
    themeName: fieldStore(state, 'name'),
    setTheme: (name: string) => provider.setTheme(name),
    toggleTheme,
    mode: derived(state, (current) => current.theme.mode),
  }
}

/**
 * The current theme object, React's `useCurrentTheme` in Svelte's idiom.
 *
 * @returns A readable store of the current theme.
 */
export function useCurrentTheme(): Readable<Theme> {
  const { theme } = useTheme()
  return theme
}

/**
 * The current theme mode, React's `useThemeMode` in Svelte's idiom.
 *
 * @returns A readable store of 'light' or 'dark'.
 */
export function useThemeMode(): Readable<'light' | 'dark'> {
  const { mode } = useTheme()
  return mode
}

/**
 * The current theme's colors, React's `useThemeColors` in Svelte's idiom.
 *
 * @returns A readable store of the current theme's colors.
 */
export function useThemeColors(): Readable<Theme['colors']> {
  const { theme } = useTheme()
  return derived(theme, (current) => current.colors)
}
