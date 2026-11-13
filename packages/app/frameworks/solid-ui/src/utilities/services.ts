/**
 * Reactive access to the app services the UI components read (theme, auth,
 * router, i18n) through the Solid framework binding's contexts.
 *
 * `@molecule/app-solid` exposes the providers as plain getters; these
 * helpers add the signal subscription each provider offers so a component
 * re-renders when the underlying service state changes — the Solid
 * equivalent of the React hooks (`useTheme`, `useAuth`) the reference
 * components use.
 *
 * @module
 */

import { createSignal, onCleanup, untrack } from 'solid-js'

import type { AuthClient, AuthState } from '@molecule/app-auth'
import type { I18nProvider, LocaleConfig } from '@molecule/app-i18n'
import type { RouteLocation, Router } from '@molecule/app-routing'
import { getAuthClient, getI18nProvider, getRouter, getThemeProvider } from '@molecule/app-solid'
import type { Theme, ThemeProvider } from '@molecule/app-theme'

/**
 * Subscribes to a theme provider and exposes the active theme reactively.
 *
 * @returns A tuple of the current theme and the provider itself.
 */
export function createThemeState(): () => Theme {
  const provider: ThemeProvider = getThemeProvider()
  const [theme, setTheme] = createSignal<Theme>(untrack(() => provider.getTheme()))
  onCleanup(
    provider.subscribe((next) => {
      setTheme(next)
    }),
  )
  return theme
}

/**
 * Subscribes to the auth client and exposes its state reactively.
 *
 * @template T - The signed-in user shape the component reads.
 * @returns An accessor for the current auth state plus the client itself.
 */
export function createAuthState<T = Record<string, unknown>>(): {
  state: () => AuthState<T>
  client: AuthClient<T>
} {
  const client = getAuthClient<T>()
  const [state, setState] = createSignal<AuthState<T>>(untrack(() => client.getState()))
  onCleanup(
    client.subscribe((next) => {
      setState(next)
    }),
  )
  return { state, client }
}

/**
 * Subscribes to the router and exposes the current location reactively.
 *
 * @returns An accessor for the current location plus the router itself.
 */
export function createLocation(): { location: () => RouteLocation; router: Router } {
  const router = getRouter()
  const [location, setLocation] = createSignal<RouteLocation>(untrack(() => router.getLocation()))
  onCleanup(
    router.subscribe((next) => {
      setLocation(next)
    }),
  )
  return { location, router }
}

/**
 * Subscribes to the i18n provider and exposes the active locale and the
 * registered locale list reactively (the Solid equivalent of React's
 * `useTranslation()` locale fields).
 *
 * @returns Accessors for the active locale and the registered locales.
 */
export function createI18nState(): {
  locale: () => string
  locales: () => LocaleConfig[]
  provider: I18nProvider
} {
  const provider = getI18nProvider()
  const [locale, setLocale] = createSignal<string>(untrack(() => provider.getLocale()))
  const [locales, setLocales] = createSignal<LocaleConfig[]>(untrack(() => provider.getLocales()))
  onCleanup(
    provider.onLocaleChange((next) => {
      setLocale(next)
      setLocales(provider.getLocales())
    }),
  )
  return { locale, locales, provider }
}
