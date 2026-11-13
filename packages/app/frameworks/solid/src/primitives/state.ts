/**
 * Solid.js primitives for state management.
 *
 * @module
 */

import { type Accessor, createEffect, createSignal, useContext } from 'solid-js'

import { t } from '@molecule/app-i18n'
import type { StateProvider, Store, StoreConfig } from '@molecule/app-state'

import { getStateProvider, StateContext } from '../context.js'
import { useSyncExternalStore } from './external-store.js'

/**
 * Create a reactive store using Solid signals.
 *
 * @param config - Store configuration
 * @returns Store instance
 *
 * @example
 * ```tsx
 * import { createStore } from '@molecule/app-solid'
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
 * Hook options for {@link useStore}.
 *
 * @template T - The store's state type.
 * @template S - The selected value type.
 */
export interface UseStoreOptions<T, S> {
  /** Derives the subscribed value from the whole state. */
  selector?: (state: T) => S
  /** Keeps the previous result when it says the new selection equals it. */
  equalityFn?: (a: S, b: S) => boolean
}

/**
 * The fix, appended to the error below — this hook is the one place that READS
 * the context, so it is the one place that has to say where the context comes
 * from. The sentences are code (an import, a component, a bond call), so they
 * are appended in English rather than translated.
 */
const STATE_CONTEXT_FIX =
  ' To fix: render a state provider above this component — ' +
  "`import { MoleculeProvider, StateProvider } from '@molecule/app-solid'`; " +
  '<MoleculeProvider> passes the provider bonded under `@molecule/app-state` ' +
  '(bond one with `setupAllDefaultBonds()` from `@molecule/app-bonds-default-solid`, ' +
  'or `setProvider(provider)` from `@molecule/app-state`), and ' +
  '<StateProvider provider={provider}> passes one you hold. ' +
  'To read a store you already have, call useStore(store) instead — it subscribes to the ' +
  'store it is given and needs no provider.'

/**
 * The state provider from the nearest `MoleculeProvider` (`config.state`),
 * under React's hook name.
 *
 * The context comes from `config.state` — which supplies the provider bonded
 * under `@molecule/app-state` by default, so a scaffolded app needs no
 * `state` entry.
 *
 * @returns Accessor for the state provider from context.
 * @throws {Error} When no state provider is above the component — the message
 *   names the fix (which provider to render, and the import for it).
 */
export function useStateProvider(): Accessor<StateProvider> {
  const provider = useContext(StateContext)
  if (!provider) {
    throw new Error(
      t('solid.error.useStoreOutsideProvider', undefined, {
        defaultValue: 'useStateProvider must be used within a StateProvider',
      }) + STATE_CONTEXT_FIX,
    )
  }
  return () => provider
}

/**
 * Subscribe to a store with an optional selector and equality function, under
 * React's hook name.
 *
 * The store is the argument, so this hook needs NO `StateProvider`: it reads
 * `store.getState()` and subscribes with `store.subscribe()`, and never
 * touches the state context. A store minted outside the `state` bond is as
 * valid here as one `@molecule/app-state`'s `createStore()` made.
 *
 * @param store - The store to subscribe to.
 * @param options - Selector and equality function.
 * @returns Accessor for the selected state.
 * @example
 * ```tsx
 * const count = useStore(counterStore)
 * const doubled = useStore(counterStore, { selector: (s) => s.count * 2 })
 * ```
 */
export function useStore<T, S = T>(store: Store<T>, options?: UseStoreOptions<T, S>): Accessor<S> {
  const { selector, equalityFn } = options ?? {}

  // The previous selection, for the equality check. `undefined` means no read
  // has happened yet (React uses a ref with the same initial value).
  let prevSelected: S | undefined

  const getSnapshot = (): S => {
    const state = store.getState()
    const selected = selector ? selector(state) : (state as unknown as S)
    if (equalityFn && prevSelected !== undefined && equalityFn(prevSelected, selected)) {
      return prevSelected
    }
    prevSelected = selected
    return selected
  }

  return useSyncExternalStore((onChange) => store.subscribe(onChange), getSnapshot)
}

/**
 * The store's `setState` function, under React's hook name.
 *
 * @param store - The store to get setState from.
 * @returns The setState function.
 */
export function useSetStore<T>(store: Store<T>): Store<T>['setState'] {
  return store.setState
}

/**
 * A function bound to a store's `setState`/`getState`, under React's hook name.
 *
 * The action factory runs on every CALL, so it always reads fresh state.
 *
 * @param store - The store to bind to.
 * @param action - Receives setState and getState, returns the callable.
 * @returns The bound action function.
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
  return (...args: Args) => action(store.setState, store.getState)(...args)
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
 * import { getProvider } from '@molecule/app-storage'
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
  } catch (_error) {
    // Safe to ignore: corrupt/stale storage data; initial value is the correct fallback
  }

  const [state, setState] = createSignal<T>(initialValue)

  // Persist on change
  createEffect(() => {
    try {
      storage.setItem(key, JSON.stringify(state()))
    } catch (_error) {
      // Safe to ignore: persistence is best-effort; in-memory signal still works correctly
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
