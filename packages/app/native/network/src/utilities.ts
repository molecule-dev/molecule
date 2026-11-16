/**
 * `@molecule/app-network`
 * Utility functions for network
 */

import { t } from '@molecule/app-i18n'

import { isConnected, onOffline, onOnline } from './network.js'
import { hasProvider } from './provider.js'
import type { ConnectionType, NetworkStatus } from './types.js'

/**
 * Wait for a network connection to become available, polling at regular intervals.
 * Resolves `true` once connected, or `false` if the timeout elapses without connectivity.
 * @param timeout - Maximum wait time in milliseconds before giving up (default: 30000).
 * @param checkInterval - Interval in milliseconds between connectivity checks (default: 1000).
 * @returns Whether a network connection was established within the timeout.
 */
export function waitForConnection(timeout = 30000, checkInterval = 1000): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now()

    const check = async (): Promise<void> => {
      try {
        const connected = await isConnected()
        if (connected) {
          resolve(true)
          return
        }
      } catch (_error) {
        // Best-effort: a transient error during a single connectivity poll is safe to ignore —
        // the loop will retry on the next interval rather than surfacing a spurious failure.
      }

      if (Date.now() - startTime >= timeout) {
        resolve(false)
        return
      }

      setTimeout(check, checkInterval)
    }

    check()
  })
}

/**
 * Execute a callback once the device is online. If already connected, runs immediately.
 * If offline, waits up to `timeout` ms for connectivity before throwing.
 * @param callback - Function to execute once online. May be sync or async.
 * @param timeout - Maximum time in milliseconds to wait for connectivity (default: 30000).
 * @returns The return value of the callback.
 */
export async function whenOnline<T>(callback: () => T | Promise<T>, timeout = 30000): Promise<T> {
  const connected = await isConnected()

  if (!connected) {
    const success = await waitForConnection(timeout)
    if (!success) {
      throw new Error(
        t('network.error.connectionTimeout', undefined, {
          defaultValue: 'Network connection timeout',
        }),
      )
    }
  }

  return callback()
}

/**
 * Create a fetch wrapper that is aware of network connectivity. When offline, requests
 * are either queued (if `queueOfflineRequests` is true) or immediately rejected.
 * Queued requests are automatically sent when connectivity is restored.
 * @param options - Configuration for offline behavior.
 * @param options.onOffline - Called when the device goes offline.
 * @param options.onReconnect - Called when the device reconnects after being offline.
 * @param options.queueOfflineRequests - If true, requests made while offline are queued and retried on reconnect.
 * @returns A fetch-compatible function that handles offline scenarios.
 */
export function createNetworkAwareFetch(options?: {
  onOffline?: () => void
  onReconnect?: () => void
  queueOfflineRequests?: boolean
}) {
  const offlineQueue: Array<{
    input: RequestInfo | URL
    init?: RequestInit
    resolve: (response: Response) => void
    reject: (error: Error) => void
  }> = []

  let wasOffline = false

  // Listen for network changes
  if (hasProvider()) {
    onOnline(() => {
      if (wasOffline) {
        wasOffline = false
        options?.onReconnect?.()

        // Process queued requests
        if (options?.queueOfflineRequests) {
          while (offlineQueue.length > 0) {
            const request = offlineQueue.shift()!
            fetch(request.input, request.init).then(request.resolve).catch(request.reject)
          }
        }
      }
    })

    onOffline(() => {
      wasOffline = true
      options?.onOffline?.()
    })
  }

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const connected = hasProvider() ? await isConnected() : true

    if (!connected) {
      if (options?.queueOfflineRequests) {
        return new Promise((resolve, reject) => {
          offlineQueue.push({ input, init, resolve, reject })
        })
      }
      throw new Error(
        t('network.error.unavailable', undefined, { defaultValue: 'Network unavailable' }),
      )
    }

    return fetch(input, init)
  }
}

/**
 * Get a human-readable display name for a connection type. Supports optional i18n
 * translation via a provided `t` function, falling back to English defaults.
 *
 * Each connection type maps to one literal `t()` call with a literal key
 * (`network.<type>`), so the locale bond's parity check can see every key and
 * every non-English locale resolves it; a type outside the known set resolves
 * to the `network.unknown` fallback key.
 *
 * @param type - The connection type to get a name for.
 * @param t - Optional i18n translation function for localized names.
 * @returns The localized or default display name for the connection type.
 */
export function getConnectionTypeName(
  type: ConnectionType,
  t?: (
    key: string,
    values?: Record<string, unknown>,
    options?: { defaultValue?: string },
  ) => string,
): string {
  switch (type) {
    case 'wifi':
      return t ? t('network.wifi', undefined, { defaultValue: 'Wi-Fi' }) : 'Wi-Fi'
    case 'cellular':
      return t ? t('network.cellular', undefined, { defaultValue: 'Cellular' }) : 'Cellular'
    case 'ethernet':
      return t ? t('network.ethernet', undefined, { defaultValue: 'Ethernet' }) : 'Ethernet'
    case 'bluetooth':
      return t ? t('network.bluetooth', undefined, { defaultValue: 'Bluetooth' }) : 'Bluetooth'
    case 'vpn':
      return t ? t('network.vpn', undefined, { defaultValue: 'VPN' }) : 'VPN'
    case 'other':
      return t ? t('network.other', undefined, { defaultValue: 'Other' }) : 'Other'
    case 'none':
      return t ? t('network.none', undefined, { defaultValue: 'Disconnected' }) : 'Disconnected'
    case 'unknown':
      return t ? t('network.unknown', undefined, { defaultValue: 'Unknown' }) : 'Unknown'
    default:
      return t ? t('network.unknown', undefined, { defaultValue: 'Unknown' }) : 'Unknown'
  }
}

/**
 * Check whether the current network status is suitable for large downloads.
 * Returns false if disconnected, metered, save-data is enabled, or on a cellular connection.
 * @param status - The current network status to evaluate.
 * @returns Whether the network conditions are favorable for large downloads.
 */
export function isSuitableForLargeDownload(status: NetworkStatus): boolean {
  if (!status.connected) return false
  if (status.isMetered) return false
  if (status.saveData) return false
  if (status.connectionType === 'cellular') return false
  return true
}
