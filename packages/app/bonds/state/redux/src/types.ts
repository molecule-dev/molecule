/**
 * Type definitions for Redux state provider.
 *
 * @module
 */

import type {
  CaseReducerActions,
  ConfigureStoreOptions,
  EnhancedStore,
  PayloadAction,
  Reducer,
  SliceCaseReducers,
  ValidateSliceCaseReducers,
} from '@reduxjs/toolkit'

import type {
  GetState,
  SetState,
  StateListener,
  StateProvider,
  Store,
  StoreConfig,
  StoreMiddleware,
} from '@molecule/app-state'

// Re-export core types
export type {
  GetState,
  SetState,
  StateListener,
  StateProvider,
  Store,
  StoreConfig,
  StoreMiddleware,
}

// Re-export Redux Toolkit types for advanced usage
export type { ConfigureStoreOptions, EnhancedStore, PayloadAction }

/**
 * Extended store config for Redux-specific options.
 */
export interface ReduxStoreConfig<T> extends StoreConfig<T> {
  /**
   * Enable Redux DevTools.
   */
  devTools?: boolean

  /**
   * Additional Redux middleware.
   */
  reduxMiddleware?: ConfigureStoreOptions['middleware']

  /**
   * Preloaded state (overrides initialState if provided).
   */
  preloadedState?: T
}

/**
 * Redux slice configuration. Each reducer takes the state and, when it reads one, a typed
 * `PayloadAction<P>`, as with Redux Toolkit's own `createSlice`.
 */
export interface SliceConfig<
  T,
  Reducers extends SliceCaseReducers<T>,
  Name extends string = string,
> {
  name: Name
  initialState: T
  reducers: ValidateSliceCaseReducers<T, Reducers>
}

/**
 * Slice type with actions: one action creator per reducer, taking that reducer's payload, or no
 * argument for a reducer that reads none.
 */
export interface Slice<T, Reducers extends SliceCaseReducers<T>, Name extends string = string> {
  name: Name
  initialState: T
  reducer: Reducer<T>
  actions: CaseReducerActions<Reducers, Name>
}

/**
 * Redux store with slices configuration.
 */
export interface ReduxStoreWithSlicesConfig {
  /** Slices from `createSlice`, each mounted under its name. */
  slices: ReadonlyArray<{ name: string; reducer: Reducer }>
  devTools?: boolean
  middleware?: ConfigureStoreOptions['middleware']
  preloadedState?: Record<string, unknown>
}

/**
 * Thunk API interface for async actions.
 */
export interface ThunkAPI<T> {
  dispatch: (action: { type: string; payload?: unknown }) => void
  getState: () => T
  signal: AbortSignal
}
