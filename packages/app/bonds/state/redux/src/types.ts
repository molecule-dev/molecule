/**
 * Type definitions for Redux state provider.
 *
 * @module
 */

import type { ConfigureStoreOptions, EnhancedStore, PayloadAction } from '@reduxjs/toolkit'

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
 * Redux slice configuration.
 */
export interface SliceConfig<
  T extends object,
  Reducers extends Record<string, (state: T, action: PayloadAction<unknown>) => T | void>,
> {
  name: string
  initialState: T
  reducers: Reducers
}

/**
 * Slice type with actions.
 */
export interface Slice<
  T extends object,
  Reducers extends Record<string, (state: T, action: PayloadAction<unknown>) => T | void>,
> {
  name: string
  initialState: T
  reducer: (state: T | undefined, action: { type: string; payload?: unknown }) => T
  actions: {
    [K in keyof Reducers]: Reducers[K] extends (state: T, action: PayloadAction<infer P>) => unknown
      ? (payload: P) => PayloadAction<P>
      : () => PayloadAction<void>
  }
}

/**
 * Redux store with slices configuration.
 */
export interface ReduxStoreWithSlicesConfig {
  slices: Array<{ name: string; reducer: (state: unknown, action: unknown) => unknown }>
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
