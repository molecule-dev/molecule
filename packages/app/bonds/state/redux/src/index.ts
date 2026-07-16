/**
 * Redux Toolkit state provider for molecule.dev.
 *
 * Implements the `StateProvider` interface from `@molecule/app-state` on Redux
 * Toolkit (`configureStore` + an internal slice per store), plus direct-Redux
 * helpers (`createSlice`, `combineSlices`, `createReduxStore`, `createSelector`)
 * for apps that want conventional slice-based stores.
 *
 * @see https://redux-toolkit.js.org/
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/app-state'
 * import { createStore, provider } from '@molecule/app-state-redux'
 *
 * setProvider(provider)
 *
 * // name/devTools are redux-bond EXTENSIONS: the core createStore() accepts only
 * // the portable StoreConfig — use the bond's own createStore for them.
 * const store = createStore({
 *   initialState: { count: 0 },
 *   name: 'counter',        // shows up in Redux DevTools
 *   devTools: false,        // defaults to TRUE — disable explicitly for production
 * })
 * ```
 *
 * @remarks
 * - **Redux DevTools is enabled by default** (`devTools: true`) — pass
 *   `devTools: false` per store when you don't want the extension hook in production.
 * - **`destroy()` is not a plain teardown**: it swaps in a reducer that resets the
 *   store to `initialState` — subscribers still attached will observe a reset.
 * - `preloadedState` seeds the store's starting value, but resets (`destroy()`)
 *   return to `initialState`, not `preloadedState`.
 * - `reduxMiddleware` uses Redux Toolkit v2's callback form
 *   (`(getDefaultMiddleware) => …`) — passing a plain array throws at runtime.
 * - Each molecule `createStore()` is an isolated RTK store. The slice helpers
 *   (`createSlice`/`combineSlices`/`createReduxStore`) are a separate direct-Redux
 *   surface — stores built with them do NOT implement the molecule `Store` contract.
 *
 * @module
 */

export * from './provider.js'
export * from './slices.js'
export * from './store.js'
export * from './types.js'
export * from './utilities.js'
