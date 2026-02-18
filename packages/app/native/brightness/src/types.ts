/**
 * `@molecule/app-brightness`
 * Type definitions for screen brightness control interface
 */

/**
 * Brightness state
 */
export interface BrightnessState {
  /** Current brightness (0-1) */
  brightness: number
  /** Whether auto-brightness is enabled */
  isAuto: boolean
  /** System brightness (0-1) */
  systemBrightness?: number
  /** Whether keep-screen-on is enabled */
  keepScreenOn: boolean
}

/**
 * Brightness options
 */
export interface BrightnessOptions {
  /** Whether to persist the brightness setting */
  persist?: boolean
  /** Whether to animate the change */
  animate?: boolean
  /** Animation duration in ms */
  animationDuration?: number
}

/**
 * Brightness capabilities
 */
export interface BrightnessCapabilities {
  /** Whether brightness control is supported */
  supported: boolean
  /** Whether auto-brightness control is supported */
  canControlAuto: boolean
  /** Whether keep-screen-on is supported */
  canKeepScreenOn: boolean
  /** Whether system brightness can be read */
  canReadSystemBrightness: boolean
  /** Minimum brightness value */
  minBrightness: number
  /** Maximum brightness value */
  maxBrightness: number
}

/**
 * Brightness provider interface
 */
export interface BrightnessProvider {
  /**
   * Get current brightness
   */
  getBrightness(): Promise<number>

  /**
   * Set screen brightness
   * @param brightness - Brightness value (0-1)
   * @param options - Options
   */
  setBrightness(brightness: number, options?: BrightnessOptions): Promise<void>

  /**
   * Get full brightness state
   */
  getState(): Promise<BrightnessState>

  /**
   * Check if auto-brightness is enabled
   */
  isAutoBrightness(): Promise<boolean>

  /**
   * Enable/disable auto-brightness
   * @param enabled - Whether to enable auto-brightness
   */
  setAutoBrightness(enabled: boolean): Promise<void>

  /**
   * Keep screen on (prevent dimming/sleep)
   * @param keepOn - Whether to keep screen on
   */
  setKeepScreenOn(keepOn: boolean): Promise<void>

  /**
   * Check if keep-screen-on is enabled
   */
  isKeepScreenOn(): Promise<boolean>

  /**
   * Reset brightness to system default
   */
  reset(): Promise<void>

  /**
   * Get the platform's brightness control capabilities.
   * @returns The capabilities indicating which brightness features are supported.
   */
  getCapabilities(): Promise<BrightnessCapabilities>
}
