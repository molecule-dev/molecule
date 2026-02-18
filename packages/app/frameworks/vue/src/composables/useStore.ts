/**
 * Vue composable for state management.
 *
 * @module
 */

import { computed, type ComputedRef, inject, onUnmounted, type Ref, ref } from 'vue'

import type { StateProvider, Store } from '@molecule/app-state'

import { StateKey } from '../injection-keys.js'
import type { UseStoreOptions } from '../types.js'

/**
 * Composable to access the state provider from injection.
 *
 * @returns The state provider
 * @throws {Error} Error if used without providing state
 */
export function useStateProvider(): StateProvider {
  const provider = inject(StateKey)
  if (!provider) {
    throw new Error('useStateProvider requires StateProvider to be provided')
  }
  return provider
}

/**
 * Composable to subscribe to a store with optional selector.
 *
 * @param store - The store to subscribe to
 * @param options - Composable options (selector)
 * @returns Reactive state reference
 *
 * @example
 * ```vue
 * <script setup>
 * import { useStore } from '`@molecule/app-vue`'
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
  const { selector } = options ?? {}

  // Create reactive ref with initial state
  const state = ref(selector ? selector(store.getState()) : store.getState()) as Ref<S>

  // Subscribe to store changes
  const unsubscribe = store.subscribe(() => {
    const newState = store.getState()
    state.value = selector ? selector(newState) : (newState as unknown as S)
  })

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
 * Composable to create a computed store value.
 *
 * @param store - The store
 * @param selector - Selector function
 * @returns Computed reference
 */
export function useStoreComputed<T, S>(store: Store<T>, selector: (state: T) => S): ComputedRef<S> {
  const state = useStore(store)
  return computed(() => selector(state.value as T))
}
