/**
 * `@molecule/app-network`
 * Network convenience functions
 */

import { getProvider } from './provider.js'
import type {
  ConnectionType,
  NetworkCapabilities,
  NetworkChangeEvent,
  NetworkStatus,
} from './types.js'

/**
 * Get the current network status.
 * @returns The network status including connectivity, connection type, speed, and metering.
 */
export async function getStatus(): Promise<NetworkStatus> {
  return getProvider().getStatus()
}

/**
 * Check if the device has an active network connection.
 * @returns Whether the device is connected to a network.
 */
export async function isConnected(): Promise<boolean> {
  return getProvider().isConnected()
}

/**
 * Get the current connection type.
 * @returns The connection type: 'wifi', 'cellular', 'ethernet', etc.
 */
export async function getConnectionType(): Promise<ConnectionType> {
  return getProvider().getConnectionType()
}

/**
 * Listen for network status changes.
 * @param callback - Called with a NetworkChangeEvent when connectivity or connection type changes.
 * @returns A function that unsubscribes the listener when called.
 */
export function onChange(callback: (event: NetworkChangeEvent) => void): () => void {
  return getProvider().onChange(callback)
}

/**
 * Listen for the device coming online.
 * @param callback - Called when the device regains network connectivity.
 * @returns A function that unsubscribes the listener when called.
 */
export function onOnline(callback: () => void): () => void {
  return getProvider().onOnline(callback)
}

/**
 * Listen for the device going offline.
 * @param callback - Called when the device loses network connectivity.
 * @returns A function that unsubscribes the listener when called.
 */
export function onOffline(callback: () => void): () => void {
  return getProvider().onOffline(callback)
}

/**
 * Perform an active network connectivity check by reaching a URL.
 * @param url - URL to test against (default: platform-specific).
 * @returns Whether the connectivity check succeeded.
 */
export async function checkConnectivity(url?: string): Promise<boolean> {
  return getProvider().checkConnectivity(url)
}

/**
 * Get the platform's network monitoring capabilities.
 * @returns The capabilities indicating which network features are supported.
 */
export async function getCapabilities(): Promise<NetworkCapabilities> {
  return getProvider().getCapabilities()
}
