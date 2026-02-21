/**
 * React Native network status provider using `@react-native-community/netinfo`.
 *
 * Implements the NetworkProvider interface from `@molecule/app-network`.
 *
 * @module
 */

import { t } from '@molecule/app-i18n'
import { getLogger } from '@molecule/app-logger'
import type {
  CellularGeneration,
  ConnectionType,
  NetworkCapabilities,
  NetworkChangeEvent,
  NetworkProvider,
  NetworkStatus,
} from '@molecule/app-network'

import type { ReactNativeNetworkConfig } from './types.js'

/** NetInfo state shape from `@react-native-community/netinfo`. */
interface NetInfoState {
  isConnected: boolean | null
  isInternetReachable: boolean | null
  type: string
  details: {
    cellularGeneration?: string
    isConnectionExpensive?: boolean
  } | null
}

/** NetInfo module shape. */
interface NetInfoModule {
  fetch(): Promise<NetInfoState>
  addEventListener(callback: (state: NetInfoState) => void): () => void
}

/**
 * Dynamically loads `@react-native-community/netinfo`.
 * @returns The NetInfo module.
 */
async function getNetInfo(): Promise<NetInfoModule> {
  try {
    // @ts-expect-error — @react-native-community/netinfo is a peer dependency loaded at runtime
    const mod = (await import('@react-native-community/netinfo')) as unknown as {
      default?: NetInfoModule
    } & NetInfoModule
    return (mod.default ?? mod) as NetInfoModule
  } catch {
    throw new Error(
      t(
        'network.error.missingDependency',
        { library: '@react-native-community/netinfo' },
        {
          defaultValue:
            '@react-native-community/netinfo is required but not installed. Install it with: npm install @react-native-community/netinfo',
        },
      ),
    )
  }
}

/**
 * Maps NetInfo type string to molecule ConnectionType.
 * @param type - The NetInfo connection type string.
 * @returns The normalized molecule ConnectionType.
 */
function mapConnectionType(type: string): ConnectionType {
  switch (type) {
    case 'wifi':
      return 'wifi'
    case 'cellular':
      return 'cellular'
    case 'ethernet':
      return 'ethernet'
    case 'bluetooth':
      return 'bluetooth'
    case 'vpn':
      return 'vpn'
    case 'other':
      return 'other'
    case 'none':
      return 'none'
    default:
      return 'unknown'
  }
}

/**
 * Maps NetInfo cellular generation to molecule CellularGeneration.
 * @param gen - The NetInfo cellular generation string.
 * @returns The normalized molecule CellularGeneration.
 */
function mapCellularGeneration(gen?: string): CellularGeneration | undefined {
  if (!gen) return undefined
  switch (gen) {
    case '2g':
      return '2g'
    case '3g':
      return '3g'
    case '4g':
      return '4g'
    case '5g':
      return '5g'
    default:
      return 'unknown'
  }
}

/**
 * Converts a NetInfo state to a molecule NetworkStatus.
 * @param state - The NetInfo state.
 * @returns The normalized molecule NetworkStatus.
 */
function toNetworkStatus(state: NetInfoState): NetworkStatus {
  return {
    connected: state.isConnected ?? false,
    connectionType: mapConnectionType(state.type),
    cellularGeneration:
      state.type === 'cellular'
        ? mapCellularGeneration(state.details?.cellularGeneration)
        : undefined,
    isMetered: state.details?.isConnectionExpensive ?? undefined,
  }
}

/**
 * Creates a React Native network status provider backed by `@react-native-community/netinfo`.
 *
 * @param config - Optional provider configuration.
 * @returns A NetworkProvider implementation for React Native.
 */
export function createReactNativeNetworkProvider(
  config: ReactNativeNetworkConfig = {},
): NetworkProvider {
  const {
    connectivityCheckUrl = 'https://clients3.google.com/generate_204',
    connectivityCheckTimeout = 5000,
  } = config

  const logger = getLogger('network')
  let lastStatus: NetworkStatus | null = null
  const changeListeners: Array<(event: NetworkChangeEvent) => void> = []
  const onlineListeners: Array<() => void> = []
  const offlineListeners: Array<() => void> = []
  let unsubscribeNetInfo: (() => void) | undefined

  /**
   * Initializes the NetInfo event listener.
   */
  async function ensureListening(): Promise<void> {
    if (unsubscribeNetInfo) return

    const NetInfo = await getNetInfo()
    const initialState = await NetInfo.fetch()
    lastStatus = toNetworkStatus(initialState)

    unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      const previous = lastStatus ?? toNetworkStatus(state)
      const current = toNetworkStatus(state)
      lastStatus = current

      const event: NetworkChangeEvent = {
        previous,
        current,
        connectivityChanged: previous.connected !== current.connected,
        connectionTypeChanged: previous.connectionType !== current.connectionType,
      }

      for (const listener of changeListeners) {
        listener(event)
      }

      if (current.connected && !previous.connected) {
        logger.debug('Network online', current.connectionType)
        for (const listener of onlineListeners) {
          listener()
        }
      }

      if (!current.connected && previous.connected) {
        logger.debug('Network offline')
        for (const listener of offlineListeners) {
          listener()
        }
      }
    })
  }

  const provider: NetworkProvider = {
    async getStatus(): Promise<NetworkStatus> {
      const NetInfo = await getNetInfo()
      const state = await NetInfo.fetch()
      lastStatus = toNetworkStatus(state)
      return lastStatus
    },

    async isConnected(): Promise<boolean> {
      const status = await provider.getStatus()
      return status.connected
    },

    async getConnectionType(): Promise<ConnectionType> {
      const status = await provider.getStatus()
      return status.connectionType
    },

    onChange(callback: (event: NetworkChangeEvent) => void): () => void {
      changeListeners.push(callback)
      void ensureListening()
      return () => {
        const index = changeListeners.indexOf(callback)
        if (index >= 0) changeListeners.splice(index, 1)
      }
    },

    onOnline(callback: () => void): () => void {
      onlineListeners.push(callback)
      void ensureListening()
      return () => {
        const index = onlineListeners.indexOf(callback)
        if (index >= 0) onlineListeners.splice(index, 1)
      }
    },

    onOffline(callback: () => void): () => void {
      offlineListeners.push(callback)
      void ensureListening()
      return () => {
        const index = offlineListeners.indexOf(callback)
        if (index >= 0) offlineListeners.splice(index, 1)
      }
    },

    async checkConnectivity(url?: string): Promise<boolean> {
      const targetUrl = url ?? connectivityCheckUrl
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), connectivityCheckTimeout)
        const response = await fetch(targetUrl, {
          method: 'HEAD',
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        return response.ok || response.status === 204
      } catch (err) {
        logger.debug('Connectivity check failed', err)
        return false
      }
    },

    async getCapabilities(): Promise<NetworkCapabilities> {
      return {
        supported: true,
        canDetectConnectionType: true,
        canDetectCellularGeneration: true,
        canEstimateSpeed: false,
        canDetectMetered: true,
      }
    },
  }

  return provider
}

/** Default React Native network status provider. */
export const provider: NetworkProvider = createReactNativeNetworkProvider()
