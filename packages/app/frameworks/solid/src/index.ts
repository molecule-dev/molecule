/**
 * Solid.js framework bindings for molecule.dev.
 *
 * Provides Solid-specific implementations of molecule.dev core interfaces
 * using Solid's reactive primitives (signals, effects, resources): wrap the
 * app in `MoleculeProvider`, given its services as props, then consume them
 * through `createAuth`, `createTheme`, `createRouter`, `createI18n`, and the
 * other primitives.
 *
 * @example
 * ```tsx
 * import { Link, MoleculeProvider, createAuth, createTheme } from '@molecule/app-solid'
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
 *     <Show when={isAuthenticated()} fallback={<Link to="/login">Log in</Link>}>
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
 *     <MoleculeProvider state={stateProvider} auth={authClient} theme={themeProvider}>
 *       <UserProfile />
 *     </MoleculeProvider>
 *   )
 * }
 * ```
 *
 * Authentication is a three-way decision, never a boolean signed-out branch:
 * `status === 'loading'` is undecided (wait for it, do not redirect),
 * `status === 'unauthenticated'` is a rejected session, and `'unavailable'` is a
 * check that failed for another reason (a network error, a 5xx). Only a 401/403
 * answer signs a user out, so a store outage never drops a session. Read the
 * accessor where a component branches: `status()`.
 *
 * @remarks
 * - **Primitives throw outside `MoleculeProvider` — and per missing service.** It provides
 *   ONLY the services you pass; calling `createAuth()` in a tree whose provider has no `auth`
 *   throws "getAuthClient must be used within a MoleculeProvider with auth configured". Pass the
 *   service, don't catch the error.
 * - Primitive results are Solid accessors — call them (`isAuthenticated()`, `theme()`,
 *   `user()`), never read them bare; a bare `theme.colors` is a type error, and a bare
 *   `isAuthenticated` is always truthy.
 * - Call primitives at component setup (top level of the component function), not inside JSX
 *   callbacks, so subscriptions are established once.
 * - In-app links are `Link` (`<Link to="/settings">`): it navigates through the router with
 *   react-router `<Link>`'s click rules. A bare `<a href>` reloads the page; a hand-written click
 *   handler that calls `navigate()` breaks ctrl/cmd-click (new tab) unless it repeats those rules.
 *
 * @module
 */

export * from './agent-identity.js'
export * from './context.js'
export * from './link.jsx'
export * from './primitives/index.js'
export * from './provider.jsx'
export * from './routed-view.jsx'
export * from './session-ready.js'
export * from './types.js'
