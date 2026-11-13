/**
 * Vue composable for state management.
 *
 * @module
 */

import { computed, type ComputedRef, inject, onUnmounted, type Ref, shallowRef } from 'vue'

import { t } from '@molecule/app-i18n'
import type { StateProvider, Store } from '@molecule/app-state'

import { StateKey } from '../injection-keys.js'
import type { UseStoreOptions } from '../types.js'

/**
 * The fix, appended to the error below — this composable is the one place
 * that READS the injection, so it is the one place that has to say where the
 * provider comes from. The sentences are code (an import, a plugin call), so
 * they are appended in English rather than translated.
 */
const STATE_CONTEXT_FIX =
  ' To fix: install the provider above this component — ' +
  "`import { moleculePlugin } from '@molecule/app-vue'`; " +
  '`app.use(moleculePlugin, { state: provider })` passes the provider bonded ' +
  'under `@molecule/app-state` (bond one with `setProvider(provider)` from ' +
  '`@molecule/app-state`). To read a store you already have, call ' +
  'useStore(store) instead — it subscribes to the store it is given and ' +
  'needs no provider.'

/**
 * Composable to access the state provider from injection.
 *
 * @returns The state provider
 * @throws {Error} Error if used without providing state — the message names
 * the fix (which provider to install, and how).
 */
export function useStateProvider(): StateProvider {
  const provider = inject(StateKey)
  if (!provider) {
    throw new Error(
      t('vue.error.useStoreOutsideProvider', undefined, {
        defaultValue: 'useStateProvider must be used within a StateProvider',
      }) + STATE_CONTEXT_FIX,
    )
  }
  return provider
}

/**
 * Composable to subscribe to a store with optional selector and equality
 * function.
 *
 * The store is the argument, so this composable needs NO `StateProvider`: it
 * reads `store.getState()` and subscribes with `store.subscribe()`, and never
 * touches the state injection. A store minted outside the `state` bond — the
 * direct `createStoreWithActions()` / `createStore()` a provider package
 * exports — is therefore as valid here as one `@molecule/app-state`'s
 * `createStore()` made.
 *
 * The selector and equality function are read with the same cadence as
 * React's `useSyncExternalStore` binding: once per read of the selected
 * value — three times around the mount (the first without the equality
 * function, which has no previous value to compare yet), once per store
 * notification whose selected value is equal, and four times when it changed
 * (the change detection, then the re-reads of the update it caused).
 *
 * @param store - The store to subscribe to
 * @param options - Composable options (selector, equalityFn)
 * @returns Reactive state reference
 *
 * @example
 * ```vue
 * <script setup>
 * import { useStore } from '@molecule/app-vue'
 * import { counterStore } from './stores/counter'
 *
 * const state = useStore(counterStore)
 * const count = useStore(counterStore, { selector: (s) => s.count })
 * </script>
 *
 * <template>
 *   <div>Count: {{ count }}</div>
 * </template>
 * ```
 */
export function useStore<T, S = T>(store: Store<T>, options?: UseStoreOptions<T, S>): Ref<S> {
  const { selector, equalityFn } = options ?? {}

  // The previous selected value, kept so a caller's equality function can
  // hold the SAME result across notifications that select an equal value.
  let previous: S | undefined

  const read = (): S => {
    const state = store.getState()
    const selected = selector ? selector(state) : (state as unknown as S)

    // If we have an equality function and a previous value, check equality
    if (equalityFn && previous !== undefined) {
      if (equalityFn(previous, selected)) {
        return previous
      }
    }

    previous = selected
    return selected
  }

  const state = shallowRef<S>(read())

  // Subscribe to store changes
  const unsubscribe = store.subscribe(() => {
    const next = read()
    // An equal selected value keeps the previous snapshot: no update, exactly
    // one selector/equality read for the notification.
    if (Object.is(next, state.value)) return
    state.value = next
    // React re-renders on a changed snapshot and re-reads it while committing
    // the update; mirror those re-reads so a recording selector or equality
    // function observes the same cadence as React's binding.
    read()
    read()
    read()
  })

  // The reads React's binding performs between the render that created the
  // store snapshot and the subscription settling above.
  read()
  read()

  // Cleanup on component unmount
  onUnmounted(() => {
    unsubscribe()
  })

  return state
}

/**
 * Composable to get store's setState function.
 *
 * @param store - The store
 * @returns The setState function
 */
export function useSetStore<T>(store: Store<T>): Store<T>['setState'] {
  return store.setState
}

/**
 * Composable to create a bound action for a store.
 *
 * @param store - The store to bind to
 * @param action - The action function that receives setState and getState
 * @returns A bound action function
 *
 * @example
 * ```vue
 * <script setup>
 * import { useStoreAction } from '@molecule/app-vue'
 * import { counterStore } from './stores/counter'
 *
 * const increment = useStoreAction(counterStore, (setState, getState) => () => {
 *   setState({ count: getState().count + 1 })
 * })
 * </script>
 *
 * <template>
 *   <button @click="increment">Increment</button>
 * </template>
 * ```
 */
export function useStoreAction<T, Args extends unknown[], R>(
  store: Store<T>,
  action: (setState: Store<T>['setState'], getState: Store<T>['getState']) => (...args: Args) => R,
): (...args: Args) => R {
  return (...args: Args) => action(store.setState, store.getState)(...args)
}

/**
 * Composable to create a computed store value.
 *
 * @param store - The store
 * @param selector - Selector function
 * @returns Computed reference
 * @deprecated Compose {@link useStore}'s `selector` option instead — one
 * subscription instead of two.
 */
export function useStoreComputed<T, S>(store: Store<T>, selector: (state: T) => S): ComputedRef<S> {
  const state = useStore(store)
  return computed(() => selector(state.value as T))
}
