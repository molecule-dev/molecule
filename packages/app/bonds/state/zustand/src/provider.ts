/**
 * Zustand state provider implementation.
 *
 * @module
 */

import { createStore } from './store.js'
import type { StateProvider, StoreConfig } from './types.js'

/**
 * Creates a Zustand state provider for use with `setProvider()` from `@molecule/app-state`.
 * @returns A `StateProvider` that creates Zustand-backed stores.
 */
export const createProvider = (): StateProvider => ({
  createStore: <T>(config: StoreConfig<T>) => createStore(config),
})

/** Default Zustand state provider instance. */
export const provider: StateProvider = createProvider()
