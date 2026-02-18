/**
 * Zustand store implementation.
 *
 * @module
 */

import { subscribeWithSelector } from 'zustand/middleware'
import { createStore as createZustandStore } from 'zustand/vanilla'

import type { SetState, StateListener, Store, ZustandStoreConfig } from './types.js'

/**
 * Creates a Zustand-backed store that conforms to the molecule `Store` interface.
 * Uses `zustand/vanilla` with `subscribeWithSelector` middleware. Supports molecule middleware,
 * and optional persistence to `localStorage` (or a custom storage backend).
 * @param config - Store configuration including `initialState`, optional molecule `middleware`, and optional `persist` config with `name`, `storage`, and `partialize`.
 * @returns A molecule `Store` with `getState`, `setState`, `subscribe`, and `destroy`.
 */
export const createStore = <T>(config: ZustandStoreConfig<T>): Store<T> => {
  const {
    initialState,
    middleware: moleculeMiddleware,
    persist: persistConfig,
  } = config as ZustandStoreConfig<T> & {
    initialState: T
    middleware?: ((set: SetState<T>, get: () => T) => SetState<T>)[]
  }

  // Create the Zustand store with subscribeWithSelector
  const zustandStore = createZustandStore<T>()(subscribeWithSelector(() => initialState))

  // Wrap setState with molecule middleware
  let enhancedSetState: SetState<T> = (partial: Partial<T> | ((state: T) => Partial<T>)) => {
    zustandStore.setState((state: T) => {
      const nextPartial = typeof partial === 'function' ? partial(state) : partial
      return { ...state, ...nextPartial }
    })
  }

  // Apply molecule middleware
  if (moleculeMiddleware) {
    for (let i = moleculeMiddleware.length - 1; i >= 0; i--) {
      enhancedSetState = moleculeMiddleware[i](enhancedSetState, zustandStore.getState)
    }
  }

  // Handle persistence
  if (persistConfig) {
    const storage =
      persistConfig.storage ?? (typeof localStorage !== 'undefined' ? localStorage : null)

    if (storage) {
      // Load initial state from storage
      try {
        const stored = storage.getItem(persistConfig.name)
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<T>
          zustandStore.setState((state: T) => ({ ...state, ...parsed }))
        }
      } catch {
        // Ignore storage errors
      }

      // Subscribe to changes and persist
      zustandStore.subscribe((state: T) => {
        try {
          const toPersist = persistConfig.partialize ? persistConfig.partialize(state) : state
          storage.setItem(persistConfig.name, JSON.stringify(toPersist))
        } catch {
          // Ignore storage errors
        }
      })
    }
  }

  return {
    getState: zustandStore.getState,
    setState: enhancedSetState,
    subscribe: (listener: StateListener<T>) => {
      return zustandStore.subscribe((state: T, prevState: T) => {
        listener(state, prevState)
      })
    },
    destroy: () => {
      // Zustand v5 stores no longer expose a destroy method.
      // Subscribe returns an unsubscribe function per listener;
      // callers should unsubscribe individually if needed.
    },
  }
}
