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
 * The fix, appended to the error below — this hook is the one place that READS
 * the context, so it is the one place that has to say where the context comes
 * from. The sentences are code (an import, a component, a bond call), so they
 * are appended in English rather than translated.
 */
const STATE_CONTEXT_FIX =
  ' To fix: render a state provider above this component — ' +
  "`import { MoleculeProvider, StateProvider } from '@molecule/app-react'`; " +
  '<MoleculeProvider> passes the provider bonded under `@molecule/app-state` ' +
  '(bond one with `setupAllDefaultBonds()` from `@molecule/app-bonds-default-react`, ' +
  'or `setProvider(provider)` from `@molecule/app-state`), and ' +
  '<StateProvider provider={provider}> passes one you hold. ' +
  'To read a store you already have, call useStore(store) instead — it subscribes to the ' +
  'store it is given and needs no provider.'

/**
 * Hook to access the state provider from context.
 *
 * The context comes from `<StateProvider provider={…}>` or from
 * `<MoleculeProvider>` — which supplies the provider bonded under
 * `@molecule/app-state` by default, so a scaffolded app needs no `state` prop.
 *
 * Only hooks that read the context call this; `useStore(store)` takes its store
 * as an argument and works with no provider at all.
 *
 * @returns The state provider from context
 * @throws {Error} when no `StateProvider` is above the component — the message
 * names the fix (which provider to render, and the import for it).
 */
export function useStateProvider(): StateProvider {
  const provider = useContext(StateContext)
  if (!provider) {
    throw new Error(
      t('react.error.useStoreOutsideProvider', undefined, {
        defaultValue: 'useStateProvider must be used within a StateProvider',
      }) + STATE_CONTEXT_FIX,
    )
  }
  return provider
}

/**
 * Hook to subscribe to a store with optional selector and equality function.
 *
 * The store is the argument, so this hook needs NO `StateProvider`: it reads
 * `store.getState()` and subscribes with `store.subscribe()`, and never touches
 * the state context. A store minted outside the `state` bond — the direct
 * `createStoreWithActions()` / `createStore()` a provider package exports — is
 * therefore as valid here as one `@molecule/app-state`'s `createStore()` made.
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
