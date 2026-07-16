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
 * import { MoleculeProvider, createAuth, createTheme } from '@molecule/app-solid'
 * import { Show } from 'solid-js'
 * import { provider as stateProvider } from '@molecule/app-state-zustand'
 * import { provider as themeProvider } from '@molecule/app-theme-css-variables'
 * import { createJWTAuthClient } from '@molecule/app-auth'
 *
 * const authClient = createJWTAuthClient({ baseURL: '/api' })
 *
 * function UserProfile() {
 *   const { user, isAuthenticated, logout } = createAuth<{ name?: string }>()
 *   const { theme, toggleTheme } = createTheme()
 *
 *   return (
 *     <Show when={isAuthenticated()} fallback={<a href="/login">Log in</a>}>
 *       <div style={{ background: theme().colors.background }}>
 *         <h1>Welcome, {user()?.name}</h1>
 *         <button onClick={toggleTheme}>Toggle Theme</button>
 *         <button onClick={() => logout()}>Logout</button>
 *       </div>
 *     </Show>
 *   )
 * }
 *
 * function App() {
 *   return (
 *     <MoleculeProvider config={{ state: stateProvider, auth: authClient, theme: themeProvider }}>
 *       <UserProfile />
 *     </MoleculeProvider>
 *   )
 * }
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
 * - Call primitives at component setup (top level of the component function), not inside JSX
 *   callbacks, so subscriptions are established once.
 *
 * @module
 */

export * from './context.js'
export * from './primitives/index.js'
export * from './provider.jsx'
export * from './types.js'
