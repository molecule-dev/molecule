/**
 * Svelte hooks for state stores, porting React's `useStore` family.
 *
 * @module
 */

import { get, type Readable } from 'svelte/store'

import type { Store } from '@molecule/app-state'

import { useSyncExternalStore } from './external-store.js'
import { type MaybeReadable, toReadable } from './maybe-readable.js'

/** Options for {@link useStore}. */
export interface UseStoreOptions<T, S> {
  /** Selects part of the state. */
  selector?: (state: T) => S
  /** Compares two selected values; equal keeps the previous result. */
  equalityFn?: (a: S, b: S) => boolean
}

/**
 * Options for {@link useStore} that pick part of the store: a selector is
 * required, so the selected type `S` always comes from it.
 */
export interface SelectingStoreOptions<T, S> extends UseStoreOptions<T, S> {
  /** Picks the value the hook returns from the store's state. */
  selector: (state: T) => S
}

/**
 * Subscribes a store with an optional selector and equality function, React's
 * `useStore` in Svelte's idiom: a readable store of the selected value.
 *
 * The store argument may be the store itself (a molecule store has `getState`
 * AND `subscribe`, and is always a VALUE, never a source) or a readable store
 * OF a store: setting it re-subscribes to the new store and re-reads its
 * snapshot on the same component, the way React's re-render does. The options
 * (or a store of them) are read whenever the snapshot is.
 *
 * The store is the argument, so this hook needs NO state provider: it reads
 * `store.getState()` and subscribes with `store.subscribe()`. When `equalityFn`
 * says a new selected value equals the previous one, the previous result is
 * kept (the same value, not a fresh object).
 *
 * The selector and equality function run with the same cadence as React's
 * `useSyncExternalStore` binding, because React re-reads its snapshot around
 * every render; {@link useSyncExternalStore} documents the cadence.
 *
 * @param store - The store to subscribe to (or a readable store of it).
 * @param options - Hook options (selector, equalityFn), or a store of them.
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
export function useStore<T>(
  store: MaybeReadable<Store<T>>,
  options?: MaybeReadable<UseStoreOptions<T, T> | undefined>,
): Readable<T>
/**
 * Subscribes to the part of a store a selector picks.
 *
 * @param store - The store to subscribe to (or a readable store of it).
 * @param options - The selector, and an optional equality function for its
 *   results, or a store of them.
 * @returns A readable store of the selected value.
 */
export function useStore<T, S>(
  store: MaybeReadable<Store<T>>,
  options: MaybeReadable<SelectingStoreOptions<T, S>>,
): Readable<S>
/**
 * The implementation both signatures share: without a selector the selected
 * value is the state itself, which the first signature types as `T`.
 *
 * @param store - The store to subscribe to (or a readable store of it).
 * @param options - Hook options (selector, equalityFn), or a store of them.
 * @returns A readable store of the selected value.
 */
export function useStore<T>(
  store: MaybeReadable<Store<T>>,
  options?: MaybeReadable<UseStoreOptions<T, unknown> | undefined>,
): Readable<unknown> {
  const storeStore = toReadable(store)
  const optionsStore = toReadable(options)

  // The store currently subscribed: setting the source re-subscribes, as
  // React's subscribe callback (keyed on the store) does on a re-render.
  let currentStore = get(storeStore)
  let stopStore: (() => void) | null = null
  let stopSource: (() => void) | null = null

  // The previous selected value (React's prevSelectedRef): while an equality
  // function accepts it, it stays the result, so its identity is stable.
  let previous: unknown

  const getSnapshot = (): unknown => {
    const { selector, equalityFn } = get(optionsStore) ?? {}
    const state = currentStore.getState()
    // Without a selector the selection IS the store's state.
    const selected = selector ? selector(state) : state
    // With an equality function and a previous value, an equal selection
    // keeps the previous result — the same value, not a fresh object.
    if (equalityFn && previous !== undefined) {
      if (equalityFn(previous, selected)) return previous
    }
    previous = selected
    return selected
  }

  const subscribe = (onChange: () => void): (() => void) => {
    stopStore = currentStore.subscribe(onChange)
    // A new store in the source re-subscribes and re-checks the snapshot, the
    // way React's useSyncExternalStore does when its subscribe function
    // changes. The store calls back at once with the store already read.
    stopSource = storeStore.subscribe((incoming) => {
      if (Object.is(incoming, currentStore)) return
      currentStore = incoming
      stopStore?.()
      stopStore = currentStore.subscribe(onChange)
      onChange()
    })
    return () => {
      stopSource?.()
      stopStore?.()
      stopSource = null
      stopStore = null
    }
  }

  return useSyncExternalStore<unknown>(subscribe, getSnapshot)
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
