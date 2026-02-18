/**
 * `@molecule/app-lifecycle`
 * Provider management for lifecycle module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'

import type {
  AppState,
  AppStateListener,
  BatteryState,
  LifecycleProvider,
  NetworkState,
  NetworkStateListener,
} from './types.js'
import { createWebLifecycleProvider } from './web-provider.js'

const BOND_TYPE = 'lifecycle'

/**
 * Set the lifecycle provider implementation.
 * @param provider - LifecycleProvider implementation to register.
 */
export const setProvider = (provider: LifecycleProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Get the current lifecycle provider. Falls back to a web-based provider using browser APIs if none is set.
 * @returns The active LifecycleProvider instance.
 */
export const getProvider = (): LifecycleProvider => {
  if (!isBonded(BOND_TYPE)) {
    bond(BOND_TYPE, createWebLifecycleProvider())
  }
  return bondGet<LifecycleProvider>(BOND_TYPE)!
}

/**
 * Check if a lifecycle provider has been registered.
 * @returns Whether a LifecycleProvider has been bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Get the current app state.
 * @returns The current state: 'active', 'inactive', 'background', or 'unknown'.
 */
export const getAppState = (): AppState => getProvider().getAppState()

/**
 * Get the current network connectivity state.
 * @returns The network state including connection status and type.
 */
export const getNetworkState = (): Promise<NetworkState> => getProvider().getNetworkState()

/**
 * Get the current battery state, if available.
 * @returns The battery state (level, charging), or null if not available.
 */
export const getBatteryState = (): Promise<BatteryState | null> => getProvider().getBatteryState()

/**
 * Subscribe to app state changes (active, inactive, background).
 * @param listener - Called with an AppStateChange when the state transitions.
 * @returns A function that unsubscribes the listener when called.
 */
export const onAppStateChange = (listener: AppStateListener): (() => void) =>
  getProvider().onAppStateChange(listener)

/**
 * Subscribe to network connectivity changes.
 * @param listener - Called with the new NetworkState when connectivity changes.
 * @returns A function that unsubscribes the listener when called.
 */
export const onNetworkChange = (listener: NetworkStateListener): (() => void) =>
  getProvider().onNetworkChange(listener)

/**
 * Subscribe to deep link URL open events.
 * @param listener - Called with the URL string when the app is opened via a deep link.
 * @returns A function that unsubscribes the listener when called.
 */
export const onUrlOpen = (listener: (url: string) => void): (() => void) =>
  getProvider().onUrlOpen(listener)
