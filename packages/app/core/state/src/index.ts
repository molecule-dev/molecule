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
 * - **A state provider must be bonded before a store is created.** In a scaffolded app that
 *   is automatic: `setupAllDefaultBonds()` (from `@molecule/app-bonds-default-react`, called
 *   by `app/src/bonds/index.ts`'s `setupProviders()`) bonds the vanilla
 *   `simpleProvider`, and the app's `<MoleculeProvider>` supplies the React context
 *   `useStore()` reads. To use another provider, bond it instead (e.g.
 *   `@molecule/app-state-zustand` with `setProvider()`) — `createStore()` call sites do not
 *   change.
 * - **Never create a store at module scope.** Module bodies run before
 *   `setupProviders()`, so a top-level `createStore()` throws
 *   `@molecule/app-state: No provider set` at import time: every page renders blank while
 *   `tsc` passes. Create it lazily (a getter the component calls) or inside the component,
 *   after the provider is set.
 *
 * @example
 * ```ts
 * import { createStore, type Store } from '@molecule/app-state'
 * import { useStore } from '@molecule/app-react'
 *
 * const initialState = { sidebarOpen: false }
 *
 * // Created on first use, NOT at module scope — see the remarks above.
 * let uiStore: Store<typeof initialState> | undefined
 * const getUiStore = (): Store<typeof initialState> =>
 *   (uiStore ??= createStore({ initialState }))
 *
 * function Sidebar() {
 *   const store = getUiStore()
 *   const { sidebarOpen } = useStore(store) // subscribes to the store
 *   const toggle = () => store.setState({ sidebarOpen: !sidebarOpen })
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
