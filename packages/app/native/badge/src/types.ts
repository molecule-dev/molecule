/**
 * `@molecule/app-badge`
 * Type definitions for badge module.
 */

/**
 * Options for setting the app icon badge (numeric count or text overlay).
 */
export interface BadgeOptions {
  /** Badge count (0 to clear) */
  count: number
  /** Badge text (if supported, overrides count) */
  text?: string
}

/**
 * Current app badge state: count, platform support, and permission status.
 */
export interface BadgeState {
  /** Current badge count */
  count: number
  /** Whether badge is supported */
  supported: boolean
  /** Whether permission is granted */
  permissionGranted: boolean
}

/**
 * Badge permission status
 */
export type BadgePermissionStatus = 'granted' | 'denied' | 'prompt' | 'unsupported'

/**
 * Badge capabilities
 */
export interface BadgeCapabilities {
  /** Whether badges are supported */
  supported: boolean
  /** Whether permission is required */
  requiresPermission: boolean
  /** Maximum badge count (if limited) */
  maxCount?: number
  /** Whether text badges are supported */
  supportsText: boolean
  /** Whether badges can be cleared */
  canClear: boolean
}

/**
 * Badge provider interface
 */
export interface BadgeProvider {
  /**
   * Set the app badge count
   * @param count - Badge count (0 to clear)
   */
  set(count: number): Promise<void>

  /**
   * Get the current badge count
   */
  get(): Promise<number>

  /**
   * Clear the badge (set to 0)
   */
  clear(): Promise<void>

  /**
   * Increment the badge count
   * @param amount - Amount to increment (default: 1)
   * @returns The new badge count after incrementing.
   */
  increment(amount?: number): Promise<number>

  /**
   * Decrement the badge count
   * @param amount - Amount to decrement (default: 1)
   * @returns The new badge count after decrementing.
   */
  decrement(amount?: number): Promise<number>

  /**
   * Check if badges are supported
   * @returns `true` if the platform supports badges.
   */
  isSupported(): Promise<boolean>

  /**
   * Get badge permission status
   * @returns The current permission status.
   */
  getPermissionStatus(): Promise<BadgePermissionStatus>

  /**
   * Request badge permission
   * @returns The resulting permission status after the request.
   */
  requestPermission(): Promise<BadgePermissionStatus>

  /**
   * Get badge state
   * @returns The current badge state (count, supported, permissionGranted).
   */
  getState(): Promise<BadgeState>

  /**
   * Get badge capabilities
   * @returns The platform's badge capabilities.
   */
  getCapabilities(): Promise<BadgeCapabilities>
}
