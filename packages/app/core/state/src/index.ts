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
 * - **`createStore()` THROWS until a provider is bonded** — call `setProvider(...)` once at
 *   startup (the built-in `simpleProvider`, or a bond such as `@molecule/app-state-zustand`)
 *   BEFORE any module-level `createStore(...)` runs.
 * - `useStore()` from `@molecule/app-react` also throws outside a `<StateProvider>` (or
 *   `<MoleculeProvider state={...}>`) — the bond alone is not enough for React.
 * - `setState` SHALLOW-merges a partial (or an updater's result); nested objects are replaced,
 *   not deep-merged.
 *
 * @example
 * ```tsx
 * import { StateProvider, useStore } from '@molecule/app-react'
 * import { createStore, setProvider, simpleProvider } from '@molecule/app-state'
 *
 * setProvider(simpleProvider) // startup — createStore() throws until a provider is bonded
 *
 * interface UiState {
 *   sidebarOpen: boolean
 *   unread: number
 * }
 *
 * export const uiStore = createStore<UiState>({
 *   name: 'ui',
 *   initialState: { sidebarOpen: false, unread: 3 },
 * })
 *
 * function UnreadBadge() {
 *   // selector → re-renders only when `unread` changes
 *   const unread = useStore(uiStore, { selector: (state) => state.unread })
 *   return <span data-mol-id="unread-badge">{unread}</span>
 * }
 *
 * export function App() {
 *   return (
 *     <StateProvider provider={simpleProvider}>
 *       <UnreadBadge />
 *     </StateProvider>
 *   )
 * }
 *
 * // Anywhere (event handlers, services): shallow-merged, subscribers re-render.
 * uiStore.setState((state) => ({ unread: state.unread + 1 }))
 * console.log(uiStore.getState()) // { sidebarOpen: false, unread: 4 }
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
