/**
 * Simple vanilla JavaScript state provider.
 *
 * This is the default provider used when no external state library
 * (e.g. Zustand, Jotai) is bonded. Works in any environment.
 *
 * @module
 */

import type { SetState, StateListener, StateProvider, Store, StoreConfig } from './types.js'

/**
 * Creates a vanilla JavaScript state provider that manages stores
 * with simple object spreading and listener-based subscriptions.
 *
 * @returns A `StateProvider` implementation.
 */
export const createSimpleStateProvider = (): StateProvider => {
  return {
    createStore<T>(config: StoreConfig<T>): Store<T> {
      let state = config.initialState
      const listeners = new Set<StateListener<T>>()

      let setState: SetState<T> = (partial) => {
        const prevState = state
        const nextPartial = typeof partial === 'function' ? partial(state) : partial
        state = { ...state, ...nextPartial }

        listeners.forEach((listener) => {
          listener(state, prevState)
        })
      }

      // Apply middleware (in reverse order so first middleware is outermost)
      if (config.middleware) {
        for (let i = config.middleware.length - 1; i >= 0; i--) {
          setState = config.middleware[i](setState, () => state)
        }
      }

      return {
        getState: () => state,
        setState,
        subscribe: (listener) => {
          listeners.add(listener)
          return () => listeners.delete(listener)
        },
        destroy: () => {
          listeners.clear()
        },
      }
    },
  }
}

/**
 * Pre-created default state provider instance.
 */
export const simpleProvider = createSimpleStateProvider()
