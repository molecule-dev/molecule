/**
 * Molecule provider accessors for the Svelte UI components — the counterpart
 * of the React package's `useTranslation`, `useTheme`, `useAuth` and
 * `useLocation` hooks, reading the providers `setMoleculeContext` put into
 * Svelte context and exposing their state as Svelte stores so components
 * re-render when the provider announces a change.
 *
 * Like their React counterparts these are only legal during component
 * initialization (they call `getContext`); call them at the top of a
 * component's `<script>`.
 *
 * @module
 */

import { derived, type Readable, readable } from 'svelte/store'

import type { AuthClient, AuthState } from '@molecule/app-auth'
import type { LocaleConfig, TranslateFunction } from '@molecule/app-i18n'
import type { RouteLocation } from '@molecule/app-routing'
import { getAuthClient, getI18nProvider, getRouter, getThemeProvider } from '@molecule/app-svelte'

/** i18n access: the translation function plus reactive locale state. */
export interface I18nAccess {
  /** A store of the translation function; its identity changes on every locale change. */
  t: Readable<TranslateFunction>
  /** The active locale code. */
  locale: Readable<string>
  /** Every locale registered with the provider. */
  locales: Readable<LocaleConfig[]>
  /** Switches the active locale. */
  setLocale: (code: string) => Promise<void>
}

/**
 * Reads the i18n provider from context as reactive stores.
 *
 * @returns Translation and locale state (see {@link I18nAccess}).
 */
export function useI18n(): I18nAccess {
  const provider = getI18nProvider()
  let revision = 0
  const version = readable(revision, (set) =>
    provider.onLocaleChange(() => {
      revision += 1
      set(revision)
    }),
  )
  const translate: TranslateFunction = (key, values, options) => provider.t(key, values, options)
  return {
    t: derived(version, () => translate),
    locale: derived(version, () => provider.getLocale()),
    locales: derived(version, () => provider.getLocales()),
    setLocale: (code) => provider.setLocale(code),
  }
}

/** Theme access: the active mode and the toggle action. */
export interface ThemeAccess {
  /** The active theme mode (`light` or `dark`). */
  mode: Readable<'light' | 'dark'>
  /** Flips the provider between light and dark (prefers `toggleMode`). */
  toggleTheme: () => void
}

/**
 * Reads the theme provider from context as a reactive mode store.
 *
 * @returns The mode store and the toggle action (see {@link ThemeAccess}).
 */
export function useTheme(): ThemeAccess {
  const provider = getThemeProvider()
  const mode = readable(provider.getTheme().mode, (set) =>
    provider.subscribe(() => set(provider.getTheme().mode)),
  )
  const toggleTheme = (): void => {
    if (typeof provider.toggleMode === 'function') {
      provider.toggleMode()
      return
    }
    const themes = provider.getThemes?.() ?? []
    if (themes.length === 0) return
    const current = provider.getTheme().name
    const index = themes.findIndex((t) => t.name === current)
    provider.setTheme(themes[(index + 1) % themes.length]!.name)
  }
  return { mode, toggleTheme }
}

/** Auth access: the reactive auth state and the auth client itself. */
export interface AuthAccess<T> {
  /** The reactive auth state (status, user, authenticated). */
  state: Readable<AuthState<T>>
  /** The auth client from context. */
  client: AuthClient<T>
}

/**
 * Reads the auth client from context and exposes its state as a store.
 *
 * @returns Auth state and the client (see {@link AuthAccess}).
 */
export function useAuth<T = unknown>(): AuthAccess<T> {
  const client = getAuthClient<T>()
  const state = readable(client.getState(), (set) =>
    client.onAuthChange(() => set(client.getState())),
  )
  return { state, client }
}

/**
 * Reads the current route location from the router in context as a store.
 *
 * @returns The reactive route location.
 */
export function useLocation(): Readable<RouteLocation> {
  const router = getRouter()
  return readable(router.getLocation(), (set) => router.subscribe(() => set(router.getLocation())))
}
