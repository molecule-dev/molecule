/**
 * Solid.js framework bindings for molecule.dev.
 *
 * Provides Solid-specific implementations of molecule.dev core interfaces
 * using Solid's reactive primitives (signals, effects, resources): wrap the
 * app in `MoleculeProvider` with a `config` of providers, then consume them
 * through `createAuth`, `createTheme`, `createRouter`, `createI18n`, and the
 * other primitives.
 *
 * @example
 * ```tsx
 * import { Show } from 'solid-js'
 * import { render } from 'solid-js/web'
 *
 * import { createJWTAuthClient } from '@molecule/app-auth'
 * import { getProvider as getI18nProvider, registerLocaleModule } from '@molecule/app-i18n'
 * import * as commonLocales from '@molecule/app-locales-common'
 * import { createAuth, createI18n, createTheme, MoleculeProvider } from '@molecule/app-solid'
 * import { provider as stateProvider } from '@molecule/app-state-zustand'
 * import { provider as themeProvider } from '@molecule/app-theme-css-variables'
 *
 * interface User {
 *   id: string
 *   name: string
 * }
 *
 * registerLocaleModule(commonLocales) // translations for the `auth.*` / `theme.*` keys below
 * const authClient = createJWTAuthClient<User>({ baseURL: '/api' })
 *
 * function Dashboard() {
 *   // Primitives return accessors — call them: isAuthenticated(), user(), mode().
 *   const { user, isAuthenticated } = createAuth<User>()
 *   const { t } = createI18n()
 *   const { mode, toggleTheme } = createTheme()
 *   return (
 *     <main data-theme={mode()}>
 *       <Show
 *         when={isAuthenticated()}
 *         fallback={<h1>{t('auth.login.logIn', undefined, { defaultValue: 'Log in' })}</h1>}
 *       >
 *         <h1>{t('auth.modal.loggedInAs', { who: user()?.name ?? '' }, { defaultValue: 'Logged in as {{who}}' })}</h1>
 *       </Show>
 *       <button type="button" data-mol-id="toggle-theme" onClick={toggleTheme}>
 *         {t('theme.toggle', undefined, { defaultValue: 'Toggle theme' })}
 *       </button>
 *     </main>
 *   )
 * }
 *
 * function App() {
 *   return (
 *     <MoleculeProvider config={{ state: stateProvider, auth: authClient, theme: themeProvider, i18n: getI18nProvider() }}>
 *       <Dashboard />
 *     </MoleculeProvider>
 *   )
 * }
 *
 * // index.html contains <div id="root"></div>.
 * render(() => <App />, document.getElementById('root') as HTMLElement)
 * ```
 *
 * @remarks
 * - **Primitives throw outside `MoleculeProvider` — and per missing service.** `config` wires
 *   ONLY the services you pass; calling `createAuth()` in a tree whose config lacks `auth`
 *   throws "getAuthClient must be used within a MoleculeProvider with auth configured". Fix the
 *   config, don't catch the error.
 * - Primitive results are Solid accessors — call them (`isAuthenticated()`, `theme()`,
 *   `user()`), never read them bare; a bare `theme.colors` is a type error, and a bare
 *   `isAuthenticated` is always truthy.
 * - **`createI18n().t` translates through the `i18n` in `config`** and re-renders on
 *   `setLocale()`. The plain `t` from `@molecule/app-i18n` reads the BONDED provider instead and
 *   is not reactive inside Solid components.
 * - `createTheme().toggleTheme()` calls the provider's `toggleMode()` (light ↔ dark), NOT a cycle
 *   through `getThemes()`; use `setTheme(name)` to pick a named theme.
 * - Call primitives at component setup (top level of the component function), not inside JSX
 *   callbacks, so subscriptions are established once.
 *
 * @module
 */

export * from './context.js'
export * from './primitives/index.js'
export * from './provider.jsx'
export * from './types.js'
