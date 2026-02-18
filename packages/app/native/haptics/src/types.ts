/**
 * `@molecule/app-haptics`
 * Type definitions for haptics module.
 */

/**
 * Impact feedback styles - for button presses, collisions, etc.
 */
export type ImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'

/**
 * Notification feedback types - for success/warning/error states
 */
export type NotificationType = 'success' | 'warning' | 'error'

/**
 * Haptic pattern element for custom patterns
 */
export interface HapticPatternElement {
  /** Type of haptic event */
  type: 'impact' | 'pause'
  /** Style for impact events */
  style?: ImpactStyle
  /** Duration in milliseconds for pause events */
  duration?: number
}

/**
 * Haptic capabilities on the current device
 */
export interface HapticCapabilities {
  /** Whether haptics are supported */
  supported: boolean
  /** Whether impact feedback is available */
  impactFeedback: boolean
  /** Whether notification feedback is available */
  notificationFeedback: boolean
  /** Whether selection feedback is available */
  selectionFeedback: boolean
  /** Whether custom patterns are supported */
  customPatterns: boolean
}

/**
 * Haptics provider interface
 */
export interface HapticsProvider {
  /**
   * Trigger impact feedback
   * @param style - Impact style (default: 'medium')
   */
  impact(style?: ImpactStyle): Promise<void>

  /**
   * Trigger notification feedback
   * @param type - Notification type (default: 'success')
   */
  notification(type?: NotificationType): Promise<void>

  /**
   * Trigger selection feedback (light tap for UI selections)
   */
  selection(): Promise<void>

  /**
   * Vibrate for a specified duration
   * @param duration - Duration in milliseconds (default: 300)
   */
  vibrate(duration?: number): Promise<void>

  /**
   * Play a custom haptic pattern
   * @param pattern - Array of haptic pattern elements
   */
  playPattern(pattern: HapticPatternElement[]): Promise<void>

  /**
   * Check if haptics are supported on the current device
   * @returns Whether haptic feedback is supported.
   */
  isSupported(): Promise<boolean>

  /**
   * Get haptic capabilities for the current device
   * @returns The available haptic capabilities.
   */
  getCapabilities(): Promise<HapticCapabilities>
}
