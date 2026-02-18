/**
 * Redux state provider implementation.
 *
 * @module
 */

import { createStore } from './store.js'
import type { StateProvider, StoreConfig } from './types.js'

/**
 * Creates a Redux state provider for use with `setProvider()` from `@molecule/app-state`.
 * @returns A `StateProvider` that creates Redux Toolkit-backed stores.
 */
export const createProvider = (): StateProvider => ({
  createStore: <T>(config: StoreConfig<T>) => createStore(config),
})

/** Default Redux state provider instance. */
export const provider: StateProvider = createProvider()
