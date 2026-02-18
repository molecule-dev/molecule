/**
 * Jotai store implementation.
 *
 * @module
 */

import { atom, createStore as createJotaiStoreBase } from 'jotai/vanilla'

import type { JotaiStoreConfig, SetState, StateListener, Store } from './types.js'

/**
 * Creates a Jotai-backed `Store` implementing the molecule state interface. Wraps a Jotai atom
 * with `getState`, `setState` (with partial merge), `subscribe`, and optional middleware.
 * @param config - Store configuration with initial state, optional middleware, and optional Jotai store instance.
 * @returns A `Store` with getState/setState/subscribe/destroy methods.
 */
export const createStore = <T>(config: JotaiStoreConfig<T>): Store<T> => {
  const {
    initialState,
    middleware: moleculeMiddleware,
    jotaiStore,
  } = config as JotaiStoreConfig<T> & {
    initialState: T
    middleware?: ((set: SetState<T>, get: () => T) => SetState<T>)[]
  }

  // Create or use provided Jotai store
  const store = jotaiStore ?? createJotaiStoreBase()

  // Create the state atom
  const stateAtom = atom<T>(initialState)

  // Initialize the atom in the store
  store.set(stateAtom, initialState)

  // Track listeners
  const listeners = new Set<StateListener<T>>()

  // Subscribe to atom changes
  store.sub(stateAtom, () => {
    const state = store.get(stateAtom)
    listeners.forEach((listener) => {
      // Note: Jotai doesn't track previous state, so we pass current state twice
      // This is a limitation of the adapter pattern
      listener(state, state)
    })
  })

  // Wrap setState with molecule middleware
  let enhancedSetState: SetState<T> = (partial: Partial<T> | ((state: T) => Partial<T>)) => {
    const currentState = store.get(stateAtom)
    const nextPartial = typeof partial === 'function' ? partial(currentState) : partial
    store.set(stateAtom, { ...currentState, ...nextPartial })
  }

  // Apply molecule middleware
  if (moleculeMiddleware) {
    for (let i = moleculeMiddleware.length - 1; i >= 0; i--) {
      enhancedSetState = moleculeMiddleware[i](enhancedSetState, () => store.get(stateAtom))
    }
  }

  return {
    getState: () => store.get(stateAtom),
    setState: enhancedSetState,
    subscribe: (listener: StateListener<T>) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    destroy: () => {
      listeners.clear()
    },
  }
}
