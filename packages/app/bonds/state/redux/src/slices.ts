/**
 * Redux slice utilities.
 *
 * @module
 */

import {
  configureStore,
  createSlice as createReduxSlice,
  type EnhancedStore,
  type PayloadAction,
} from '@reduxjs/toolkit'

import type { ReduxStoreWithSlicesConfig, Slice, SliceConfig } from './types.js'

/**
 * Creates a Redux slice (for modular stores).
 *
 * @param config - The configuration.
 * @example
 * ```typescript
 * const counterSlice = createSlice({
 *   name: 'counter',
 *   initialState: { count: 0 },
 *   reducers: {
 *     increment: (state) => { state.count += 1 },
 *     decrement: (state) => { state.count -= 1 },
 *     setCount: (state, action: PayloadAction<number>) => { state.count = action.payload },
 *   },
 * })
 *
 * // Use with a Redux store
 * store.dispatch(counterSlice.actions.increment())
 * ```
 * @returns A `Slice` with `name`, `reducer`, `actions`, and `initialState`.
 */
export const createSlice = <
  T extends object,
  Reducers extends Record<string, (state: T, action: PayloadAction<unknown>) => T | void>,
>(
  config: SliceConfig<T, Reducers>,
): Slice<T, Reducers> => {
  const reduxSlice = createReduxSlice(config as Parameters<typeof createReduxSlice>[0])
  // Redux Toolkit uses getInitialState(), so we expose initialState for convenience
  return {
    ...reduxSlice,
    initialState: config.initialState,
  } as unknown as Slice<T, Reducers>
}

/**
 * Create a configured Redux store that combines multiple slices into one store.
 *
 * @example
 * ```typescript
 * const store = createReduxStore({
 *   slices: [counterSlice, userSlice],
 *   devTools: true,
 * })
 * ```
 * @param config - Store configuration with slices, devTools flag, optional middleware, and preloaded state.
 * @returns A configured Redux EnhancedStore with combined reducers from all provided slices.
 */
export const createReduxStore = (config: ReduxStoreWithSlicesConfig): EnhancedStore => {
  const { slices, devTools = true, middleware, preloadedState } = config

  const reducer: Record<string, (state: unknown, action: unknown) => unknown> = {}
  for (const slice of slices) {
    reducer[slice.name] = slice.reducer
  }

  return configureStore({
    reducer,
    devTools,
    middleware,
    preloadedState,
  })
}
