/**
 * Svelte hooks for state stores, porting React's `useStore` family.
 *
 * @module
 */

import type { Readable } from 'svelte/store'

import type { Store } from '@molecule/app-state'

import { useSyncExternalStore } from './external-store.js'

/** Options for {@link useStore}. */
export interface UseStoreOptions<T, S> {
  /** Selects part of the state. */
  selector?: (state: T) => S
  /** Compares two selected values; equal keeps the previous result. */
  equalityFn?: (a: S, b: S) => boolean
}

/**
 * Subscribes a store with an optional selector and equality function, React's
 * `useStore` in Svelte's idiom: a readable store of the selected value.
 *
 * The store is the argument, so this hook needs NO state provider: it reads
 * `store.getState()` and subscribes with `store.subscribe()`. When
 * `equalityFn` says a new selected value equals the previous one, the previous
 * result is kept (the same value, not a fresh object).
 *
 * The selector and equality function run with the same cadence as React's
 * `useSyncExternalStore` binding, because React re-reads its snapshot around
 * every render; {@link useSyncExternalStore} documents the cadence.
 *
 * @param store - The store to subscribe to.
 * @param options - Hook options (selector, equalityFn).
 * @returns A readable store of the selected state.
 * @example
 * ```svelte
 * <script>
 *   import { useStore } from '@molecule/app-svelte'
 *   const count = useStore(counterStore, { selector: (s) => s.count })
 *   const doubled = useStore(counterStore, { selector: (s) => s.count * 2 })
 * </script>
 *
 * <p>{$count} / {$doubled}</p>
 * ```
 */
export function useStore<T, S = T>(store: Store<T>, options?: UseStoreOptions<T, S>): Readable<S> {
  const { selector, equalityFn } = options ?? {}

  // The previous selected value (React's prevSelectedRef): while an equality
  // function accepts it, it stays the result, so its identity is stable.
  let previous: S | undefined

  return useSyncExternalStore<S>(
    (onChange) => store.subscribe(onChange),
    () => {
      const state = store.getState()
      const selected = selector ? selector(state) : (state as unknown as S)
      // With an equality function and a previous value, an equal selection
      // keeps the previous result — the same value, not a fresh object.
      if (equalityFn && previous !== undefined) {
        if (equalityFn(previous, selected)) return previous
      }
      previous = selected
      return selected
    },
  )
}

/**
 * The store's setState function, React's `useSetStore` in Svelte's idiom.
 *
 * @param store - The store to get setState from.
 * @returns The store's setState function.
 */
export function useSetStore<T>(store: Store<T>): Store<T>['setState'] {
  return store.setState
}

/**
 * A bound action for a store, React's `useStoreAction` in Svelte's idiom.
 *
 * @param store - The store to bind to.
 * @param action - The action function that receives setState and getState.
 * @returns A bound action function.
 * @example
 * ```svelte
 * <script>
 *   import { useStoreAction } from '@molecule/app-svelte'
 *   const increment = useStoreAction(counterStore, (setState, getState) => () => {
 *     setState({ count: getState().count + 1 })
 *   })
 * </script>
 *
 * <button onclick={increment}>+1</button>
 * ```
 */
export function useStoreAction<T, Args extends unknown[], R>(
  store: Store<T>,
  action: (setState: Store<T>['setState'], getState: Store<T>['getState']) => (...args: Args) => R,
): (...args: Args) => R {
  const bound = action(store.setState, store.getState)
  return (...args: Args) => bound(...args)
}
