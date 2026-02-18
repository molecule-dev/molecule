/**
 * Solid.js primitives for state management.
 *
 * @module
 */

import { type Accessor, createEffect, createSignal, onCleanup } from 'solid-js'

import type { StateProvider, Store, StoreConfig } from '@molecule/app-state'

import { getStateProvider } from '../context.js'

/**
 * Create a reactive store using Solid signals.
 *
 * @param config - Store configuration
 * @returns Store instance
 *
 * @example
 * ```tsx
 * import { createStore } from '`@molecule/app-solid`'
 *
 * interface CounterState {
 *   count: number
 * }
 *
 * const counterStore = createStore<CounterState>({
 *   initial: { count: 0 },
 * })
 *
 * function Counter() {
 *   const count = useStore(counterStore, (s) => s.count)
 *
 *   return (
 *     <button onClick={() => counterStore.setState({ count: count() + 1 })}>
 *       Count: {count()}
 *     </button>
 *   )
 * }
 * ```
 */
export function createStore<T extends object>(config: StoreConfig<T>): Store<T> {
  const provider = getStateProvider()
  return provider.createStore(config)
}

/**
 * Use a store with optional selector, returning an accessor.
 *
 * @param store - Store to subscribe to
 * @param selector - Optional selector function
 * @returns Accessor for selected state
 *
 * @example
 * ```tsx
 * function UserName() {
 *   const name = useStore(userStore, (s) => s.name)
 *   return <span>{name()}</span>
 * }
 * ```
 */
export function useStore<T extends object, S = T>(
  store: Store<T>,
  selector?: (state: T) => S,
): Accessor<S> {
  const select = selector ?? ((s: T) => s as unknown as S)
  const [state, setState] = createSignal<S>(select(store.getState()))

  createEffect(() => {
    const unsubscribe = store.subscribe((newState) => {
      setState(() => select(newState))
    })

    onCleanup(unsubscribe)
  })

  return state
}

/**
 * Create a simple signal-based store without provider.
 *
 * @param initial - Initial state
 *
 * @example
 * ```tsx
 * const [count, setCount] = createSignalStore(0)
 *
 * function Counter() {
 *   return (
 *     <button onClick={() => setCount((c) => c + 1)}>
 *       Count: {count()}
 *     </button>
 *   )
 * }
 * ```
 * @returns The created instance.
 */
export function createSignalStore<T>(
  initial: T,
): [Accessor<T>, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = createSignal<T>(initial)
  return [state, setState]
}

/**
 * Storage adapter interface for persisted stores.
 */
interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem?(key: string): void
}

/**
 * Create a persisted signal store.
 *
 * @param key - Storage key
 * @param initial - Initial value
 * @param storage - Storage adapter (required - use localStorage, sessionStorage, or `@molecule/app-storage`)
 * @returns Tuple of accessor and setter
 *
 * @example
 * ```tsx
 * // Use with localStorage
 * const [theme, setTheme] = createPersistedStore('theme', 'light', localStorage)
 *
 * // Use with a custom storage provider
 * import { getProvider } from '`@molecule/app-storage`'
 * const storageProvider = getProvider()
 * const [user, setUser] = createPersistedStore('user', null, {
 *   getItem: (key) => storageProvider.get(key),
 *   setItem: (key, value) => storageProvider.set(key, value),
 * })
 * ```
 */
export function createPersistedStore<T>(
  key: string,
  initial: T,
  storage: StorageAdapter,
): [Accessor<T>, (value: T | ((prev: T) => T)) => void] {
  // Try to load from storage
  let initialValue = initial
  try {
    const stored = storage.getItem(key)
    if (stored) {
      initialValue = JSON.parse(stored)
    }
  } catch {
    // Use default
  }

  const [state, setState] = createSignal<T>(initialValue)

  // Persist on change
  createEffect(() => {
    try {
      storage.setItem(key, JSON.stringify(state()))
    } catch {
      // Ignore storage errors
    }
  })

  return [state, setState]
}

/**
 * Create state helpers from context.
 *
 * @returns State helper functions
 */

/**
 * Creates a state helpers.
 * @returns The created result.
 */
export function createStateHelpers(): {
  createStore: <T extends object>(config: StoreConfig<T>) => Store<T>
} {
  const provider = getStateProvider()

  return {
    createStore: <T extends object>(config: StoreConfig<T>) => provider.createStore(config),
  }
}

/**
 * Create state helpers from a specific provider.
 *
 * @param provider - State provider
 * @returns State helper functions
 */

/**
 * Creates a state helpers from provider.
 * @param provider - The provider implementation.
 * @returns The created result.
 */
export function createStateHelpersFromProvider(provider: StateProvider): {
  createStore: <T extends object>(config: StoreConfig<T>) => Store<T>
} {
  return {
    createStore: <T extends object>(config: StoreConfig<T>) => provider.createStore(config),
  }
}
