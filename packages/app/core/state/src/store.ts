/**
 * Store composition utilities.
 *
 * @module
 */

import type { StateListener, Store } from './types.js'

/**
 * Combines multiple stores into a single composite store. Each key
 * in `stores` becomes a top-level key in the combined state.
 *
 * @param stores - A record mapping keys to individual stores.
 * @returns A composite `Store` that delegates to the individual stores.
 */
export const combineStores = <T extends Record<string, unknown>>(stores: {
  [K in keyof T]: Store<T[K]>
}): Store<T> => {
  const listeners = new Set<StateListener<T>>()

  const getState = (): T => {
    const result = {} as T
    for (const key in stores) {
      result[key] = stores[key].getState()
    }
    return result
  }

  // Subscribe to all child stores
  const unsubscribers: (() => void)[] = []
  for (const key in stores) {
    const store = stores[key]
    const unsub = store.subscribe(() => {
      const state = getState()
      listeners.forEach((listener) => listener(state, state))
    })
    unsubscribers.push(unsub)
  }

  return {
    getState,
    setState: (partial) => {
      const updates = typeof partial === 'function' ? partial(getState()) : partial
      for (const key in updates) {
        if (key in stores) {
          stores[key].setState(updates[key] as never)
        }
      }
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    destroy: () => {
      unsubscribers.forEach((unsub) => unsub())
      listeners.clear()
    },
  }
}
