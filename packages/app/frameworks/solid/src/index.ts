/**
 * Solid.js framework bindings for molecule.dev.
 *
 * This package provides Solid.js-specific implementations of molecule.dev
 * core interfaces, using Solid's reactive primitives (signals, effects, resources).
 *
 * @module `@molecule/app-solid`
 *
 * @example
 * ```tsx
 * import { MoleculeProvider, createAuth, createTheme, createRouter } from '@molecule/app-solid'
 * import { createZustandProvider } from '@molecule/app-state-zustand'
 * import { createJwtAuthClient } from '@molecule/app-auth-jwt'
 *
 * function App() {
 *   return (
 *     <MoleculeProvider
 *       config={{
 *         state: createZustandProvider(),
 *         auth: createJwtAuthClient({ baseUrl: '/api' }),
 *       }}
 *     >
 *       <Router />
 *     </MoleculeProvider>
 *   )
 * }
 *
 * function UserProfile() {
 *   const { user, isAuthenticated, logout } = createAuth()
 *   const { theme, toggleTheme } = createTheme()
 *   const { navigate } = createRouter()
 *
 *   return (
 *     <Show when={isAuthenticated()} fallback={<LoginRedirect />}>
 *       <div style={{ background: theme().colors.background }}>
 *         <h1>Welcome, {user()?.name}</h1>
 *         <button onClick={toggleTheme}>Toggle Theme</button>
 *         <button onClick={logout}>Logout</button>
 *       </div>
 *     </Show>
 *   )
 * }
 * ```
 */

export * from './context.js'
export * from './primitives/index.js'
export * from './provider.jsx'
export * from './types.js'
