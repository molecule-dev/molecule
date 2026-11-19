/**
 * Angular functions for state stores, mirroring `useStateProvider`, `useStore`,
 * `useSetStore` and `useStoreAction` from `@molecule/app-react`.
 *
 * @module
 */

import { effect, inject, type Signal, untracked } from '@angular/core'

import { t } from '@molecule/app-i18n'
import type { StateProvider, Store } from '@molecule/app-state'

import { type MaybeSignal, readMaybeSignal } from '../maybe-signal.js'
import { STATE_PROVIDER } from '../tokens.js'
import { useExternalStore } from './external-store.js'

/**
 * Options for {@link useStore}.
 *
 * @template T - The store's state shape.
 * @template S - The selected value's shape.
 */
export interface UseStoreOptions<T, S = T> {
  /**
   * Derives the hook's value from the whole state. Receives the full state on
   * every read.
   */
  selector?: (state: T) => S
  /**
   * Compares the previous selected value with the next one; an equal pair keeps
   * the previous result. Without it, identity decides.
   */
  equalityFn?: (previous: S, next: S) => boolean
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
 * The fix, appended to the error below — this function is the one place that
 * READS the token, so it is the one place that has to say where the provider
 * comes from. The sentences are code (a function call, a bootstrap array), so
 * they are appended in English rather than translated, exactly like React's.
 */
const STATE_PROVIDER_FIX =
  ' To fix: register the provider before this component injects it — ' +
  "`import { provideMolecule } from '@molecule/app-angular'`; " +
  'provideMolecule passes the provider bonded under `@molecule/app-state` ' +
  '(bond one with `setProvider(provider)` from `@molecule/app-state`), and ' +
  'provideMolecule({ state: provider }) passes one you hold. ' +
  'To read a store you already have, call useStore(store) instead — it subscribes to the ' +
  'store it is given and needs no provider.'

/**
 * The state provider registered by `provideMolecule({ state })` (by default the
 * provider bonded under `@molecule/app-state`). Call it in an injection context.
 *
 * Only hooks that read the registration call this; `useStore(store)` takes its
 * store as an argument and works with no provider at all.
 *
 * @returns The state provider.
 * @throws {Error} When no state provider is registered — the message names the
 *   fix (which registration to add, and the call for it).
 */
export function useStateProvider(): StateProvider {
  const provider = inject(STATE_PROVIDER, { optional: true })
  if (!provider) {
    throw new Error(
      t('angular.error.useStoreOutsideProvider', undefined, {
        defaultValue: 'useStateProvider must be used within a StateProvider',
      }) + STATE_PROVIDER_FIX,
    )
  }
  return provider
}

/**
 * Subscribes to a store with an optional selector and equality function.
 * Call it in an injection context.
 *
 * The store is the argument, so this function needs NO registration: it reads
 * `store.getState()` and subscribes with `store.subscribe()`, and never touches
 * the state registration. A store minted outside the `state` bond — the direct
 * `createStoreWithActions()` / `createStore()` a provider package exports — is
 * therefore as valid here as one `@molecule/app-state`'s `createStore()` made.
 *
 * The arguments may be signals: a new store is subscribed in place of the old
 * one (the old subscription is dropped first) and new options are applied on
 * the next read, the way React re-renders `useStore` with new arguments. The
 * previous selected value the equality function compares survives the change,
 * as React's ref does.
 *
 * @param store - The store to subscribe to (or a signal of it).
 * @param options - Hook options (`selector`, `equalityFn`), or a signal of them.
 * @returns A signal of the selected state.
 */
export function useStore<T>(
  store: MaybeSignal<Store<T>>,
  options?: MaybeSignal<UseStoreOptions<T, T>>,
): Signal<T>
/**
 * Subscribes to the part of a store a selector picks.
 *
 * @param store - The store to subscribe to (or a signal of it).
 * @param options - The selector, and an optional equality function for its
 *   results, or a signal of them.
 * @returns A signal of the selected value.
 */
export function useStore<T, S>(
  store: MaybeSignal<Store<T>>,
  options: MaybeSignal<SelectingStoreOptions<T, S>>,
): Signal<S>
/**
 * The implementation both signatures share: without a selector the selected
 * value is the state itself, which the first signature types as `T`.
 *
 * @param store - The store to subscribe to (or a signal of it).
 * @param options - Hook options (`selector`, `equalityFn`), or a signal of them.
 * @returns A signal of the selected value.
 */
export function useStore<T>(
  store: MaybeSignal<Store<T>>,
  options?: MaybeSignal<UseStoreOptions<T, unknown>>,
): Signal<unknown> {
  const initialOptions = readMaybeSignal(options)
  let currentStore = readMaybeSignal(store)
  let currentSelector = initialOptions?.selector
  let currentEquality = initialOptions?.equalityFn

  // The previous selected value for the equality comparison, exactly like
  // React's ref: an equal selection keeps the previous result (its identity).
  let prevSelected: unknown

  const read = (): unknown => {
    const state = currentStore.getState()
    // No selector means the caller selected the whole state.
    const selected = currentSelector ? currentSelector(state) : state
    if (currentEquality && prevSelected !== undefined) {
      if (currentEquality(prevSelected, selected)) {
        return prevSelected
      }
    }
    prevSelected = selected
    return selected
  }

  // The store's notifications feed the external-store bridge's own callback
  // (its read discipline); the subscription is re-keyed when the store source
  // changes, as React's useSyncExternalStore re-subscribes when its store
  // does.
  let notifyStore: (() => void) | null = null
  let stop: (() => void) | null = null
  const state = useExternalStore(read, (notify) => {
    notifyStore = notify
    stop = currentStore.subscribe(() => notify())
    return () => stop?.()
  })

  effect(() => {
    const nextStore = readMaybeSignal(store)
    const nextOptions = readMaybeSignal(options)
    const nextSelector = nextOptions?.selector
    const nextEquality = nextOptions?.equalityFn
    if (
      nextStore === currentStore &&
      nextSelector === currentSelector &&
      nextEquality === currentEquality
    ) {
      return
    }
    currentStore = nextStore
    currentSelector = nextSelector
    currentEquality = nextEquality
    untracked(() => {
      stop?.()
      stop = currentStore.subscribe(() => notifyStore?.())
      notifyStore?.()
    })
  })

  return state
}

/**
 * The store's `setState` function. Call it in an injection context.
 *
 * @param store - The store to get `setState` from.
 * @returns The `setState` function.
 */
export function useSetStore<T>(store: Store<T>): Store<T>['setState'] {
  return store.setState
}

/**
 * A function bound to a store's `setState` and `getState`. Call it in an
 * injection context.
 *
 * The action receives the store's `setState` and `getState` on every call, so
 * it reads fresh state each time (like React's, which re-runs
 * `action(setState, getState)` per call).
 *
 * @param store - The store to bind to.
 * @param action - The action function that receives `setState` and `getState`.
 * @returns A bound action function.
 */
export function useStoreAction<T, Args extends unknown[], R>(
  store: Store<T>,
  action: (setState: Store<T>['setState'], getState: Store<T>['getState']) => (...args: Args) => R,
): (...args: Args) => R {
  // The action receives the store's setState and getState on every CALL, so it
  // reads fresh state each time (React re-runs action(setState, getState) per
  // call through its useCallback for the same reason).
  return (...args: Args): R => action(store.setState, store.getState)(...args)
}
