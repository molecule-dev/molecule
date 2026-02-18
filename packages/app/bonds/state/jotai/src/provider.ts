/**
 * Jotai state provider implementation.
 *
 * @module
 */

import { createStore as createJotaiStoreBase } from 'jotai/vanilla'

import { createStore } from './store.js'
import type { JotaiStore, StateProvider, StoreConfig } from './types.js'

/**
 * Creates a Jotai-based `StateProvider` for use with `setProvider()` from `@molecule/app-state`.
 * @returns A `StateProvider` that creates Jotai-backed stores.
 */
export const createProvider = (): StateProvider => ({
  createStore: <T>(config: StoreConfig<T>) => createStore(config),
})

/** Default Jotai state provider instance. */
export const provider: StateProvider = createProvider()

/**
 * Creates a new Jotai store instance for atom state management.
 * @returns A fresh Jotai store that can be used with `store.get()`, `store.set()`, and `store.sub()`.
 */
export const createJotaiStoreInstance = (): JotaiStore => {
  return createJotaiStoreBase()
}

/** The default shared Jotai store instance used across the application. */
export const defaultStore: JotaiStore = createJotaiStoreInstance()
