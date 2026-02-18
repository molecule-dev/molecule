/**
 * `@molecule/app-network`
 * Type definitions for network status interface
 */

/**
 * Network connection type
 */
export type ConnectionType =
  | 'wifi' // Wi-Fi connection
  | 'cellular' // Cellular data
  | 'ethernet' // Wired connection
  | 'bluetooth' // Bluetooth tethering
  | 'vpn' // VPN connection
  | 'other' // Other connection type
  | 'none' // No connection
  | 'unknown' // Unknown connection type

/**
 * Cellular connection generation
 */
export type CellularGeneration = '2g' | '3g' | '4g' | '5g' | 'unknown'

/**
 * Current network connectivity status (connected, type, cellular generation, metered, airplane mode).
 */
export interface NetworkStatus {
  /** Whether device is connected */
  connected: boolean
  /** Connection type */
  connectionType: ConnectionType
  /** Cellular generation (if cellular) */
  cellularGeneration?: CellularGeneration
  /** Whether connection is metered (e.g., cellular) */
  isMetered?: boolean
  /** Whether device is in airplane mode */
  isAirplaneMode?: boolean
  /** Approximate download speed in Mbps (if available) */
  downlinkSpeed?: number
  /** Approximate upload speed in Mbps (if available) */
  uplinkSpeed?: number
  /** Round-trip time in ms (if available) */
  rtt?: number
  /** Whether save-data mode is enabled */
  saveData?: boolean
}

/**
 * Network change event
 */
export interface NetworkChangeEvent {
  /** Previous network status */
  previous: NetworkStatus
  /** Current network status */
  current: NetworkStatus
  /** Whether connectivity changed */
  connectivityChanged: boolean
  /** Whether connection type changed */
  connectionTypeChanged: boolean
}

/**
 * Network capabilities
 */
export interface NetworkCapabilities {
  /** Whether network monitoring is supported */
  supported: boolean
  /** Whether connection type detection is supported */
  canDetectConnectionType: boolean
  /** Whether cellular generation detection is supported */
  canDetectCellularGeneration: boolean
  /** Whether speed estimation is supported */
  canEstimateSpeed: boolean
  /** Whether metered detection is supported */
  canDetectMetered: boolean
}

/**
 * Network provider interface
 */
export interface NetworkProvider {
  /**
   * Get the current network status.
   * @returns The network status including connectivity, connection type, speed, and metering.
   */
  getStatus(): Promise<NetworkStatus>

  /**
   * Check if the device has an active network connection.
   * @returns Whether the device is connected to a network.
   */
  isConnected(): Promise<boolean>

  /**
   * Get the current connection type.
   * @returns The connection type: 'wifi', 'cellular', 'ethernet', 'bluetooth', 'vpn', 'other', 'none', or 'unknown'.
   */
  getConnectionType(): Promise<ConnectionType>

  /**
   * Listen for network status changes
   * @param callback - Called when network status changes
   * @returns Unsubscribe function
   */
  onChange(callback: (event: NetworkChangeEvent) => void): () => void

  /**
   * Listen for online events
   * @param callback - Called when device comes online
   * @returns Unsubscribe function
   */
  onOnline(callback: () => void): () => void

  /**
   * Listen for offline events
   * @param callback - Called when device goes offline
   * @returns Unsubscribe function
   */
  onOffline(callback: () => void): () => void

  /**
   * Perform an active network connectivity check by reaching a URL.
   * @param url - URL to test against (default: platform-specific).
   * @returns Whether the connectivity check succeeded.
   */
  checkConnectivity(url?: string): Promise<boolean>

  /**
   * Get the platform's network monitoring capabilities.
   * @returns The capabilities indicating which network features are supported.
   */
  getCapabilities(): Promise<NetworkCapabilities>
}
