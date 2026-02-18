/**
 * Redux store implementation.
 *
 * @module
 */

import {
  configureStore,
  createSlice as createReduxSlice,
  type Draft,
  type PayloadAction,
} from '@reduxjs/toolkit'

import type { ReduxStoreConfig, SetState, StateListener, Store } from './types.js'

/**
 * Creates a Redux Toolkit-backed store that conforms to the molecule `Store` interface.
 * Uses `createSlice` and `configureStore` internally, with support for molecule middleware,
 * Redux DevTools, and preloaded state.
 * @param config - Store configuration including `initialState`, optional `name`, `devTools` flag, molecule `middleware`, Redux `reduxMiddleware`, and `preloadedState`.
 * @returns A molecule `Store` with `getState`, `setState`, `subscribe`, and `destroy`.
 */
export const createStore = <T>(config: ReduxStoreConfig<T>): Store<T> => {
  const {
    initialState,
    name = 'molecule',
    middleware: moleculeMiddleware,
    devTools = true,
    reduxMiddleware,
    preloadedState,
  } = config as ReduxStoreConfig<T> & {
    initialState: T
    name?: string
    middleware?: ((set: SetState<T>, get: () => T) => SetState<T>)[]
  }

  // Create a slice for the state
  const slice = createReduxSlice({
    name,
    initialState: (preloadedState ?? initialState) as T,
    reducers: {
      setState: (state: Draft<T>, action: PayloadAction<Partial<T>>) => {
        return { ...state, ...action.payload } as T & Draft<T>
      },
      resetState: () => initialState,
    },
  })

  // Configure the Redux store
  const reduxStore = configureStore({
    reducer: slice.reducer,
    devTools: devTools ? { name } : false,
    middleware: reduxMiddleware,
    preloadedState: preloadedState ?? initialState,
  })

  // Wrap setState with molecule middleware
  let enhancedSetState: SetState<T> = (partial: Partial<T> | ((state: T) => Partial<T>)) => {
    const state = reduxStore.getState() as T
    const nextPartial = typeof partial === 'function' ? partial(state) : partial
    reduxStore.dispatch(slice.actions.setState(nextPartial))
  }

  // Apply molecule middleware
  if (moleculeMiddleware) {
    for (let i = moleculeMiddleware.length - 1; i >= 0; i--) {
      enhancedSetState = moleculeMiddleware[i](enhancedSetState, () => reduxStore.getState() as T)
    }
  }

  return {
    getState: () => reduxStore.getState() as T,
    setState: enhancedSetState,
    subscribe: (listener: StateListener<T>) => {
      let prevState = reduxStore.getState() as T
      return reduxStore.subscribe(() => {
        const state = reduxStore.getState() as T
        if (state !== prevState) {
          listener(state, prevState)
          prevState = state
        }
      })
    },
    destroy: () => {
      // Redux stores don't have a destroy method
      // Clear all listeners by replacing the reducer
      reduxStore.replaceReducer(() => initialState)
    },
  }
}
