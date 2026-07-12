/**
 * Client state management interface for molecule.dev.
 *
 * Provides a unified state management API that works across different
 * state management solutions (hooks, Zustand, Redux, Jotai, etc.).
 *
 * @remarks
 * Define stores with {@link createStore} and read them through the framework hook
 * (`useStore(store)` in React / the Vue composable) — do NOT `import` zustand / redux /
 * jotai directly in a component; that couples you to one library and breaks the swap. For a
 * large store, pass a selector via the hook's options so a component re-renders only when the
 * slice it reads changes.
 *
 * - This is CLIENT/UI state — NOT the source of truth for server data. Fetch server data
 *   through the HTTP client (`@molecule/app-http`) and keep the store for UI/session state.
 * - **{@link persistMiddleware} persists to storage — never persist a secret or auth token**
 *   there (client storage is XSS-exfiltratable; the bearer token is memory-only — see
 *   `@molecule/app-storage`). Persist only non-sensitive UI state, via the storage
 *   ABSTRACTION, never raw `localStorage`.
 *
 * @example
 * ```ts
 * import { createStore } from '@molecule/app-state'
 * import { useStore } from '@molecule/app-react'
 *
 * const uiStore = createStore({ initialState: { sidebarOpen: false } })
 *
 * function Sidebar() {
 *   const { sidebarOpen } = useStore(uiStore) // subscribes to the store
 *   const toggle = () => uiStore.setState({ sidebarOpen: !sidebarOpen })
 * }
 * ```
 *
 * @module
 */

export * from './async.js'
export * from './middleware.js'
export * from './provider.js'
export * from './simple-provider.js'
export * from './store.js'
export * from './types.js'
export * from './utilities.js'
