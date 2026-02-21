/**
 * React Native lifecycle provider using AppState from react-native.
 *
 * Implements the LifecycleProvider interface from `@molecule/app-lifecycle`.
 *
 * @module
 */

import { t } from '@molecule/app-i18n'
import type {
  AppState,
  AppStateChange,
  AppStateListener,
  BatteryState,
  BatteryStateListener,
  LaunchInfo,
  LifecycleProvider,
  NetworkState,
  NetworkStateListener,
} from '@molecule/app-lifecycle'
import { getLogger } from '@molecule/app-logger'

import type { ReactNativeLifecycleConfig } from './types.js'

/** Minimal shape of the react-native module used by this provider. */
interface ReactNativeModule {
  AppState: {
    currentState: string
    addEventListener: (type: string, handler: (state: string) => void) => { remove: () => void }
  }
  Linking: {
    addEventListener: (
      type: string,
      handler: (event: { url: string }) => void,
    ) => { remove: () => void }
    getInitialURL: () => Promise<string | null>
  }
}

/**
 * Dynamically loads the react-native module.
 * @returns The react-native module.
 */
async function getReactNative(): Promise<ReactNativeModule> {
  try {
    // @ts-expect-error — react-native is a peer dependency loaded at runtime
    return (await import('react-native')) as unknown as ReactNativeModule
  } catch {
    throw new Error(
      t(
        'lifecycle.error.missingDependency',
        { library: 'react-native' },
        { defaultValue: 'react-native is required but not installed.' },
      ),
    )
  }
}

/**
 * Maps React Native AppState string to molecule AppState.
 * @param state - The React Native app state string.
 * @returns The normalized molecule AppState.
 */
function mapAppState(state: string): AppState {
  switch (state) {
    case 'active':
      return 'active'
    case 'inactive':
      return 'inactive'
    case 'background':
      return 'background'
    default:
      return 'unknown'
  }
}

/**
 * Creates a React Native lifecycle provider backed by react-native AppState.
 *
 * @param config - Optional provider configuration.
 * @returns A LifecycleProvider implementation for React Native.
 */
export function createReactNativeLifecycleProvider(
  config: ReactNativeLifecycleConfig = {},
): LifecycleProvider {
  const {
    trackUrlOpen = true,
    trackMemoryWarnings = true,
    connectivityCheckUrl = 'https://clients3.google.com/generate_204',
    connectivityCheckTimeout = 5000,
  } = config
  const logger = getLogger('lifecycle')
  let currentAppState: AppState = 'unknown'
  let previousAppState: AppState = 'unknown'
  let initialized = false

  const appStateListeners: AppStateListener[] = []
  const networkListeners: NetworkStateListener[] = []
  const batteryListeners: BatteryStateListener[] = []
  const terminateListeners: Array<() => void> = []
  const urlListeners: Array<(url: string) => void> = []
  const memoryListeners: Array<() => void> = []
  const cleanups: Array<() => void> = []

  /**
   * Initializes event listeners from react-native.
   */
  async function initialize(): Promise<void> {
    if (initialized) return
    initialized = true

    const RN = await getReactNative()

    currentAppState = mapAppState(RN.AppState.currentState)

    const appStateSub = RN.AppState.addEventListener('change', (nextState: string) => {
      previousAppState = currentAppState
      currentAppState = mapAppState(nextState)
      logger.debug('App state changed', previousAppState, '->', currentAppState)
      const change: AppStateChange = {
        current: currentAppState,
        previous: previousAppState,
        timestamp: Date.now(),
      }
      for (const listener of appStateListeners) {
        listener(change)
      }
    })
    cleanups.push(() => appStateSub.remove())

    if (trackMemoryWarnings) {
      const memorySub = RN.AppState.addEventListener('memoryWarning', () => {
        logger.warn('Memory warning received')
        for (const listener of memoryListeners) {
          listener()
        }
      })
      cleanups.push(() => memorySub.remove())
    }

    if (trackUrlOpen) {
      const linkingSub = RN.Linking.addEventListener('url', ({ url }: { url: string }) => {
        for (const listener of urlListeners) {
          listener(url)
        }
      })
      cleanups.push(() => linkingSub.remove())
    }
  }

  void initialize()

  const provider: LifecycleProvider = {
    getAppState(): AppState {
      return currentAppState
    },

    async getNetworkState(): Promise<NetworkState> {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), connectivityCheckTimeout)
        const response = await fetch(connectivityCheckUrl, {
          method: 'HEAD',
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        return {
          connected: response.ok || response.status === 204,
          connectionType: 'unknown',
        }
      } catch (err) {
        logger.debug('Connectivity check failed', err)
        return {
          connected: false,
          connectionType: 'unknown',
        }
      }
    },

    async getBatteryState(): Promise<BatteryState | null> {
      // React Native core does not provide battery API.
      // A dedicated battery bond (e.g., expo-battery) should be used instead.
      return null
    },

    async getLaunchInfo(): Promise<LaunchInfo | null> {
      try {
        const RN = await getReactNative()
        const initialUrl = await RN.Linking.getInitialURL()
        return {
          coldStart: true,
          url: initialUrl ?? undefined,
        }
      } catch {
        return null
      }
    },

    onAppStateChange(listener: AppStateListener): () => void {
      appStateListeners.push(listener)
      return () => {
        const index = appStateListeners.indexOf(listener)
        if (index >= 0) appStateListeners.splice(index, 1)
      }
    },

    onNetworkChange(listener: NetworkStateListener): () => void {
      networkListeners.push(listener)
      return () => {
        const index = networkListeners.indexOf(listener)
        if (index >= 0) networkListeners.splice(index, 1)
      }
    },

    onBatteryChange(listener: BatteryStateListener): () => void {
      batteryListeners.push(listener)
      return () => {
        const index = batteryListeners.indexOf(listener)
        if (index >= 0) batteryListeners.splice(index, 1)
      }
    },

    onTerminate(listener: () => void): () => void {
      terminateListeners.push(listener)
      return () => {
        const index = terminateListeners.indexOf(listener)
        if (index >= 0) terminateListeners.splice(index, 1)
      }
    },

    onUrlOpen(listener: (url: string) => void): () => void {
      urlListeners.push(listener)
      return () => {
        const index = urlListeners.indexOf(listener)
        if (index >= 0) urlListeners.splice(index, 1)
      }
    },

    onMemoryWarning(listener: () => void): () => void {
      memoryListeners.push(listener)
      return () => {
        const index = memoryListeners.indexOf(listener)
        if (index >= 0) memoryListeners.splice(index, 1)
      }
    },

    destroy(): void {
      for (const cleanup of cleanups) {
        cleanup()
      }
      cleanups.length = 0
      appStateListeners.length = 0
      networkListeners.length = 0
      batteryListeners.length = 0
      terminateListeners.length = 0
      urlListeners.length = 0
      memoryListeners.length = 0
      initialized = false
    },
  }

  return provider
}

/** Default React Native lifecycle provider. */
export const provider: LifecycleProvider = createReactNativeLifecycleProvider()
