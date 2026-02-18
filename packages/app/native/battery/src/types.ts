/**
 * `@molecule/app-battery`
 * Type definitions for battery module
 */

/**
 * Battery charging state
 */
export type ChargingState =
  | 'charging' // Currently charging
  | 'discharging' // Running on battery
  | 'full' // Fully charged
  | 'not-charging' // Not charging (plugged in but not charging)
  | 'unknown' // Unknown state

/**
 * Device battery status: level (0–1), charging state, time estimates, and low/critical flags.
 */
export interface BatteryStatus {
  /** Battery level (0-1) */
  level: number
  /** Whether device is charging */
  isCharging: boolean
  /** Detailed charging state */
  chargingState: ChargingState
  /** Estimated time to full charge (seconds, if charging) */
  chargingTime?: number
  /** Estimated time to discharge (seconds, if discharging) */
  dischargingTime?: number
  /** Whether battery is in low power mode */
  isLowPowerMode?: boolean
  /** Whether battery level is low (< 20%) */
  isLow: boolean
  /** Whether battery level is critical (< 5%) */
  isCritical: boolean
}

/**
 * Battery change event
 */
export interface BatteryChangeEvent {
  /** Previous status */
  previous: BatteryStatus
  /** Current status */
  current: BatteryStatus
  /** Whether level changed */
  levelChanged: boolean
  /** Whether charging state changed */
  chargingChanged: boolean
}

/**
 * Battery level thresholds
 */
export interface BatteryThresholds {
  /** Low battery threshold (default: 0.2) */
  low: number
  /** Critical battery threshold (default: 0.05) */
  critical: number
}

/**
 * Battery capabilities
 */
export interface BatteryCapabilities {
  /** Whether battery monitoring is supported */
  supported: boolean
  /** Whether charging time estimation is available */
  hasChargingTime: boolean
  /** Whether discharging time estimation is available */
  hasDischargingTime: boolean
  /** Whether low power mode detection is available */
  hasLowPowerMode: boolean
  /** Whether charging state detail is available */
  hasChargingState: boolean
}

/**
 * Battery provider interface
 */
export interface BatteryProvider {
  /**
   * Get current battery status
   * @returns The current battery status including level, charging state, and time estimates.
   */
  getStatus(): Promise<BatteryStatus>

  /**
   * Get current battery level
   * @returns Level (0-1)
   */
  getLevel(): Promise<number>

  /**
   * Check if device is charging
   * @returns Whether the device is currently charging.
   */
  isCharging(): Promise<boolean>

  /**
   * Check if low power mode is enabled
   * @returns Whether low power mode is currently active.
   */
  isLowPowerMode(): Promise<boolean>

  /**
   * Listen for battery status changes
   * @param callback - Called when battery status changes
   * @returns Unsubscribe function
   */
  onChange(callback: (event: BatteryChangeEvent) => void): () => void

  /**
   * Listen for charging state changes
   * @param callback - Called when charging state changes
   * @returns Unsubscribe function
   */
  onChargingChange(callback: (isCharging: boolean) => void): () => void

  /**
   * Listen for low battery
   * @param callback - Called when battery goes low
   * @param threshold - Threshold (default: 0.2)
   * @returns Unsubscribe function
   */
  onLow(callback: (level: number) => void, threshold?: number): () => void

  /**
   * Listen for critical battery
   * @param callback - Called when battery goes critical
   * @param threshold - Threshold (default: 0.05)
   * @returns Unsubscribe function
   */
  onCritical(callback: (level: number) => void, threshold?: number): () => void

  /**
   * Get battery capabilities
   * @returns The battery capabilities indicating supported monitoring features.
   */
  getCapabilities(): Promise<BatteryCapabilities>
}
