/**
 * State management bond accessor and store factory.
 *
 * Bond packages (e.g. `@molecule/app-state-zustand`) call `setProvider()`
 * during setup. Application code uses `createStore()` to create reactive
 * state stores backed by the bonded provider.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'

import type { StateProvider, Store, StoreConfig } from './types.js'

const BOND_TYPE = 'state'

/**
 * Registers a state provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param provider - The state provider implementation to bond.
 */
export const setProvider = (provider: StateProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded state provider, throwing if none is configured.
 *
 * @returns The bonded state provider.
 * @throws {Error} If no state provider has been bonded.
 */
export const getProvider = (): StateProvider => {
  const provider = bondGet<StateProvider>(BOND_TYPE)
  if (!provider) {
    throw new Error(
      '@molecule/app-state: No provider set. Call setProvider() first (e.g., with simpleProvider from this package, or a bond like @molecule/app-state-zustand).',
    )
  }
  return provider
}

/**
 * Checks whether a state provider is currently bonded.
 *
 * @returns `true` if a state provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Creates a new reactive state store using the bonded provider.
 *
 * @param config - Store configuration including initial state, actions, selectors, and middleware.
 * @returns A reactive store instance with `getState()`, `setState()`, and `subscribe()` methods.
 * @throws {Error} If no state provider has been bonded.
 */
export const createStore = <T>(config: StoreConfig<T>): Store<T> => {
  return getProvider().createStore(config)
}
