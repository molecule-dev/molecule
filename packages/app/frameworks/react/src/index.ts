/**
 * React framework bindings for molecule.dev.
 *
 * Provides React-specific hooks, contexts, and providers for all molecule
 * core interfaces. This package enables the use of molecule's framework-agnostic
 * interfaces with React's idioms (hooks, context, etc.).
 *
 * @example
 * ```tsx
 * import {
 *   MoleculeProvider,
 *   useAuth,
 *   useTheme,
 *   useRouter,
 *   useStore,
 * } from '@molecule/app-react'
 * import { provider as stateProvider } from '@molecule/app-state-zustand'
 * import { createJWTAuthClient } from '@molecule/app-auth'
 *
 * // Setup providers
 * function App() {
 *   return (
 *     <MoleculeProvider
 *       state={stateProvider}
 *       auth={authClient}
 *       theme={themeProvider}
 *     >
 *       <MyApp />
 *     </MoleculeProvider>
 *   )
 * }
 *
 * // Use hooks anywhere in the app
 * function UserDashboard() {
 *   const { user, logout } = useAuth()
 *   const { theme, toggleTheme } = useTheme()
 *   const count = useStore(counterStore)
 *
 *   return (
 *     <div style={{ background: theme.colors.background }}>
 *       <h1>Welcome, {user?.name}!</h1>
 *       <p>Count: {count}</p>
 *       <button onClick={toggleTheme}>Toggle Theme</button>
 *       <button onClick={logout}>Logout</button>
 *     </div>
 *   )
 * }
 * ```
 *
 * @module
 */

export * from './contexts.js'
export * from './hooks/index.js'
export * from './providers.js'
export * from './types.js'
