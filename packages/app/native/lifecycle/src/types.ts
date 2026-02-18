/**
 * `@molecule/app-lifecycle`
 * Type definitions for lifecycle module
 */

/**
 * App state values.
 */
export type AppState = 'active' | 'inactive' | 'background' | 'unknown'

/**
 * App state change event.
 */
export interface AppStateChange {
  /**
   * Current state.
   */
  current: AppState

  /**
   * Previous state.
   */
  previous: AppState

  /**
   * Timestamp of the change.
   */
  timestamp: number
}

/**
 * Device network connectivity state (connected, connection type, metered).
 */
export interface NetworkState {
  /**
   * Whether the device is connected.
   */
  connected: boolean

  /**
   * Connection type.
   */
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'none' | 'unknown'

  /**
   * Whether the connection is expensive (cellular).
   */
  isExpensive?: boolean
}

/**
 * Device battery state (level 0–1 and charging status).
 */
export interface BatteryState {
  /**
   * Battery level (0-1).
   */
  level: number

  /**
   * Whether the device is charging.
   */
  charging: boolean

  /**
   * Time until fully charged (seconds).
   */
  chargingTime?: number

  /**
   * Time until discharged (seconds).
   */
  dischargingTime?: number
}

/**
 * App launch info.
 */
export interface LaunchInfo {
  /**
   * Whether the app was cold started.
   */
  coldStart: boolean

  /**
   * URL that launched the app (deep link).
   */
  url?: string

  /**
   * Notification that launched the app.
   */
  notification?: unknown

  /**
   * Launch options/extras.
   */
  extras?: Record<string, unknown>
}

/**
 * Callback invoked when the app state changes.
 * @param change - The state change event with current, previous, and timestamp.
 */
export type AppStateListener = (change: AppStateChange) => void

/**
 * Callback invoked when the network state changes.
 */
export type NetworkStateListener = (state: NetworkState) => void

/**
 * Callback invoked when the battery state changes.
 */
export type BatteryStateListener = (state: BatteryState) => void

/**
 * Lifecycle provider interface.
 *
 * All lifecycle providers must implement this interface.
 */
export interface LifecycleProvider {
  /**
   * Get the current app state.
   * @returns The current app state: 'active', 'inactive', 'background', or 'unknown'.
   */
  getAppState(): AppState

  /**
   * Get the current network connectivity state.
   * @returns The network state including connection status and type.
   */
  getNetworkState(): Promise<NetworkState>

  /**
   * Get the current battery state, if available.
   * @returns The battery state (level, charging), or null if not available.
   */
  getBatteryState(): Promise<BatteryState | null>

  /**
   * Get the app launch info (cold start, deep link URL, notification).
   * @returns The launch info, or null if not available.
   */
  getLaunchInfo(): Promise<LaunchInfo | null>

  /**
   * Subscribe to app state changes (active, inactive, background).
   * @param listener - Called when the app state changes.
   * @returns A function that unsubscribes the listener when called.
   */
  onAppStateChange(listener: AppStateListener): () => void

  /**
   * Subscribe to network connectivity changes.
   * @param listener - Called when the network state changes.
   * @returns A function that unsubscribes the listener when called.
   */
  onNetworkChange(listener: NetworkStateListener): () => void

  /**
   * Subscribe to battery state changes.
   * @param listener - Called when the battery state changes.
   */
  onBatteryChange(listener: BatteryStateListener): () => void

  /**
   * Subscribe to app termination events.
   * @param listener - Called when the app is about to be terminated.
   * @returns A function that unsubscribes the listener when called.
   */
  onTerminate(listener: () => void): () => void

  /**
   * Subscribe to deep link URL open events.
   * @param listener - Called with the URL string when the app is opened via a deep link.
   * @returns A function that unsubscribes the listener when called.
   */
  onUrlOpen(listener: (url: string) => void): () => void

  /**
   * Subscribe to low memory warnings.
   * @param listener - Called when the system reports low memory.
   * @returns A function that unsubscribes the listener when called.
   */
  onMemoryWarning(listener: () => void): () => void

  /**
   * Destroy the provider and clean up all event listeners.
   */
  destroy(): void
}

// Type definitions for browser APIs
/**
 * Browser Battery Manager API interface.
 */
export interface BatteryManager extends EventTarget {
  charging: boolean
  chargingTime: number
  dischargingTime: number
  level: number
}

/**
 * Navigator extension with Battery API support.
 */
export interface NavigatorWithBattery extends Navigator {
  getBattery?: () => Promise<BatteryManager>
}

/**
 * Browser Network Information API interface.
 */
export interface NetworkInformation {
  type?: string
  effectiveType?: string
}

/**
 * Navigator extension with Network Information API support.
 */
export interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation
}
