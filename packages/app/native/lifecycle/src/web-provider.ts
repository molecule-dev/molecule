/**
 * `@molecule/app-lifecycle`
 * Web-based lifecycle provider implementation
 */

import type {
  AppState,
  AppStateChange,
  AppStateListener,
  BatteryManager,
  BatteryState,
  BatteryStateListener,
  LaunchInfo,
  LifecycleProvider,
  NavigatorWithBattery,
  NavigatorWithConnection,
  NetworkState,
  NetworkStateListener,
} from './types.js'

/**
 * Create a web-based lifecycle provider using browser APIs (Page Visibility,
 * Navigator.onLine, Battery API). Used as the default fallback when no
 * native provider is registered.
 * @returns A LifecycleProvider implementation backed by browser APIs.
 */
export const createWebLifecycleProvider = (): LifecycleProvider => {
  const appStateListeners = new Set<AppStateListener>()
  const networkListeners = new Set<NetworkStateListener>()
  const batteryListeners = new Set<BatteryStateListener>()
  const terminateListeners = new Set<() => void>()
  const urlOpenListeners = new Set<(url: string) => void>()
  const memoryWarningListeners = new Set<() => void>()

  let currentState: AppState = 'active'
  let battery: BatteryManager | null = null

  // Map visibility state to app state
  const getAppStateFromVisibility = (): AppState => {
    if (typeof document === 'undefined') return 'unknown'
    return document.visibilityState === 'visible' ? 'active' : 'background'
  }

  // Visibility change handler
  const handleVisibilityChange = (): void => {
    const previous = currentState
    currentState = getAppStateFromVisibility()

    if (previous !== currentState) {
      const change: AppStateChange = {
        current: currentState,
        previous,
        timestamp: Date.now(),
      }
      appStateListeners.forEach((listener) => listener(change))
    }
  }

  // Network change handler
  const handleNetworkChange = (): void => {
    const state = getNetworkStateSync()
    networkListeners.forEach((listener) => listener(state))
  }

  // Battery change handler
  const handleBatteryChange = (): void => {
    if (!battery) return
    const state: BatteryState = {
      level: battery.level,
      charging: battery.charging,
      chargingTime: battery.chargingTime === Infinity ? undefined : battery.chargingTime,
      dischargingTime: battery.dischargingTime === Infinity ? undefined : battery.dischargingTime,
    }
    batteryListeners.forEach((listener) => listener(state))
  }

  // Before unload handler
  const handleBeforeUnload = (): void => {
    terminateListeners.forEach((listener) => listener())
  }

  // Hash change handler (for simple deep links)
  const handleHashChange = (): void => {
    const url = window.location.href
    urlOpenListeners.forEach((listener) => listener(url))
  }

  // Memory pressure handler
  const handleMemoryPressure = (): void => {
    memoryWarningListeners.forEach((listener) => listener())
  }

  // Initialize listeners
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange)
    currentState = getAppStateFromVisibility()
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleNetworkChange)
    window.addEventListener('offline', handleNetworkChange)
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('hashchange', handleHashChange)

    // Battery API
    if ('getBattery' in navigator) {
      ;(navigator as NavigatorWithBattery).getBattery?.().then((b) => {
        battery = b
        b.addEventListener('chargingchange', handleBatteryChange)
        b.addEventListener('levelchange', handleBatteryChange)
      })
    }

    // Memory pressure (Chrome only)
    if ('memory' in performance) {
      // @ts-expect-error - experimental API
      performance.measureUserAgentSpecificMemory?.().then((result: unknown) => {
        // Monitor memory usage
        if (result && typeof result === 'object' && 'bytes' in result) {
          const bytes = (result as { bytes: number }).bytes
          if (bytes > 500 * 1024 * 1024) {
            // 500MB threshold
            handleMemoryPressure()
          }
        }
      })
    }
  }

  const getNetworkStateSync = (): NetworkState => {
    if (typeof navigator === 'undefined') {
      return { connected: true, connectionType: 'unknown' }
    }

    const connection = (navigator as NavigatorWithConnection).connection
    const online = navigator.onLine

    if (!online) {
      return { connected: false, connectionType: 'none' }
    }

    let connectionType: NetworkState['connectionType'] = 'unknown'
    let isExpensive = false

    if (connection) {
      const type = connection.type || connection.effectiveType || ''
      if (type.includes('wifi') || type === '4g') {
        connectionType = 'wifi'
      } else if (type.includes('cellular') || type === '3g' || type === '2g') {
        connectionType = 'cellular'
        isExpensive = true
      } else if (type.includes('ethernet')) {
        connectionType = 'ethernet'
      }
    }

    return { connected: true, connectionType, isExpensive }
  }

  return {
    getAppState: () => currentState,

    async getNetworkState(): Promise<NetworkState> {
      return getNetworkStateSync()
    },

    async getBatteryState(): Promise<BatteryState | null> {
      if (!battery && typeof navigator !== 'undefined' && 'getBattery' in navigator) {
        try {
          battery = (await (navigator as NavigatorWithBattery).getBattery?.()) || null
        } catch {
          return null
        }
      }

      if (!battery) return null

      return {
        level: battery.level,
        charging: battery.charging,
        chargingTime: battery.chargingTime === Infinity ? undefined : battery.chargingTime,
        dischargingTime: battery.dischargingTime === Infinity ? undefined : battery.dischargingTime,
      }
    },

    async getLaunchInfo(): Promise<LaunchInfo | null> {
      // Web apps don't have traditional launch info
      const url = typeof window !== 'undefined' ? window.location.href : undefined
      return {
        coldStart: true,
        url,
      }
    },

    onAppStateChange(listener: AppStateListener): () => void {
      appStateListeners.add(listener)
      return () => appStateListeners.delete(listener)
    },

    onNetworkChange(listener: NetworkStateListener): () => void {
      networkListeners.add(listener)
      return () => networkListeners.delete(listener)
    },

    onBatteryChange(listener: BatteryStateListener): () => void {
      batteryListeners.add(listener)
      return () => batteryListeners.delete(listener)
    },

    onTerminate(listener: () => void): () => void {
      terminateListeners.add(listener)
      return () => terminateListeners.delete(listener)
    },

    onUrlOpen(listener: (url: string) => void): () => void {
      urlOpenListeners.add(listener)
      return () => urlOpenListeners.delete(listener)
    },

    onMemoryWarning(listener: () => void): () => void {
      memoryWarningListeners.add(listener)
      return () => memoryWarningListeners.delete(listener)
    },

    destroy(): void {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleNetworkChange)
        window.removeEventListener('offline', handleNetworkChange)
        window.removeEventListener('beforeunload', handleBeforeUnload)
        window.removeEventListener('hashchange', handleHashChange)
      }
      if (battery) {
        battery.removeEventListener('chargingchange', handleBatteryChange)
        battery.removeEventListener('levelchange', handleBatteryChange)
      }
      appStateListeners.clear()
      networkListeners.clear()
      batteryListeners.clear()
      terminateListeners.clear()
      urlOpenListeners.clear()
      memoryWarningListeners.clear()
    },
  }
}

/**
 * Pre-created web lifecycle provider instance, or null if running outside a browser.
 */
export const webProvider = typeof document !== 'undefined' ? createWebLifecycleProvider() : null
