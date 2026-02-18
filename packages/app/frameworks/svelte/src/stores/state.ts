/**
 * Svelte stores for state management.
 *
 * @module
 */

import { derived, type Readable, readable } from 'svelte/store'

import type { Store as MoleculeStore } from '@molecule/app-state'

/**
 * Create a readable Svelte store from a molecule store.
 *
 * @param store - The molecule store
 * @returns Readable Svelte store
 *
 * @example
 * ```svelte
 * <script>
 *   import { createStoreReadable } from '`@molecule/app-svelte`'
 *   import { counterStore } from './stores/counter'
 *
 *   const count = createStoreReadable(counterStore)
 * </script>
 *
 * <p>Count: {$count}</p>
 * ```
 */
export function createStoreReadable<T>(store: MoleculeStore<T>): Readable<T> {
  return readable(store.getState(), (set: (value: T) => void) => {
    return store.subscribe(() => {
      set(store.getState())
    })
  })
}

/**
 * Create a derived Svelte store with a selector.
 *
 * @param store - The molecule store
 * @param selector - Selector function
 * @returns Derived Svelte store
 *
 * @example
 * ```svelte
 * <script>
 *   import { createStoreSelector } from '`@molecule/app-svelte`'
 *   import { userStore } from './stores/user'
 *
 *   const userName = createStoreSelector(userStore, s => s.name)
 * </script>
 *
 * <p>Hello, {$userName}!</p>
 * ```
 */
export function createStoreSelector<T, S>(
  store: MoleculeStore<T>,
  selector: (state: T) => S,
): Readable<S> {
  const storeReadable = createStoreReadable(store)
  return derived(storeReadable, selector)
}

/**
 * Get the setState function from a molecule store.
 *
 * @param store - The molecule store
 * @returns setState function
 */
export function getSetStore<T>(store: MoleculeStore<T>): MoleculeStore<T>['setState'] {
  return store.setState
}

/**
 * Create a bound action for a store.
 *
 * @param store - The store
 * @param action - Action creator function
 * @returns Bound action
 */
export function createStoreAction<T, Args extends unknown[], R>(
  store: MoleculeStore<T>,
  action: (
    setState: MoleculeStore<T>['setState'],
    getState: MoleculeStore<T>['getState'],
  ) => (...args: Args) => R,
): (...args: Args) => R {
  return (...args: Args) => action(store.setState, store.getState)(...args)
}
