/**
 * React hook for state management.
 *
 * @module
 */

import { useCallback, useContext, useRef, useSyncExternalStore } from 'react'

import { t } from '@molecule/app-i18n'
import type { StateProvider, Store } from '@molecule/app-state'

import { StateContext } from '../contexts.js'
import type { UseStoreOptions } from '../types.js'

/**
 * Hook to access the state provider from context.
 *
 * @returns The state provider from context
 * @throws {Error} Error if used outside of StateProvider
 */
export function useStateProvider(): StateProvider {
  const provider = useContext(StateContext)
  if (!provider) {
    throw new Error(
      t('react.error.useStoreOutsideProvider', undefined, {
        defaultValue: 'useStateProvider must be used within a StateProvider',
      }),
    )
  }
  return provider
}

/**
 * Hook to subscribe to a store with optional selector and equality function.
 *
 * @param store - The store to subscribe to
 * @param options - Hook options (selector, equalityFn)
 * @returns The selected state
 *
 * @example
 * ```tsx
 * const count = useStore(counterStore)
 * const doubled = useStore(counterStore, { selector: (s) => s.count * 2 })
 * ```
 */
export function useStore<T, S = T>(store: Store<T>, options?: UseStoreOptions<T, S>): S {
  // Validate that we're within a StateProvider
  useStateProvider()

  const { selector, equalityFn } = options ?? {}

  // Use a ref to track the previous selected value for equality comparison
  const prevSelectedRef = useRef<S | undefined>(undefined)

  const getSnapshot = useCallback(() => {
    const state = store.getState()
    const selected = selector ? selector(state) : (state as unknown as S)

    // If we have an equality function and a previous value, check equality
    if (equalityFn && prevSelectedRef.current !== undefined) {
      if (equalityFn(prevSelectedRef.current, selected)) {
        return prevSelectedRef.current
      }
    }

    prevSelectedRef.current = selected
    return selected
  }, [store, selector, equalityFn])

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return store.subscribe(onStoreChange)
    },
    [store],
  )

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Hook to get the store's setState function.
 *
 * @param store - The store to get setState from
 * @returns The setState function
 */
export function useSetStore<T>(store: Store<T>): Store<T>['setState'] {
  return store.setState
}

/**
 * Hook to create a bound action for a store.
 *
 * @param store - The store to bind to
 * @param action - The action function that receives setState and getState
 * @returns A bound action function
 *
 * @example
 * ```tsx
 * const increment = useStoreAction(counterStore, (setState, getState) => () => {
 *   setState({ count: getState().count + 1 })
 * })
 * ```
 */
export function useStoreAction<T, Args extends unknown[], R>(
  store: Store<T>,
  action: (setState: Store<T>['setState'], getState: Store<T>['getState']) => (...args: Args) => R,
): (...args: Args) => R {
  return useCallback(
    (...args: Args) => action(store.setState, store.getState)(...args),
    [store, action],
  )
}
