/**
 * `@molecule/app-keyboard`
 * Type definitions for keyboard module
 */

/**
 * Keyboard visibility state
 */
export interface KeyboardState {
  /** Whether keyboard is visible */
  isVisible: boolean
  /** Keyboard height in pixels */
  height: number
  /** Screen height without keyboard */
  screenHeight: number
}

/**
 * Keyboard show event
 */
export interface KeyboardShowEvent {
  /** Keyboard height in pixels */
  keyboardHeight: number
  /** Animation duration in milliseconds (iOS) */
  animationDuration?: number
  /** Animation curve (iOS) */
  animationCurve?: string
}

/**
 * Keyboard hide event
 */
export interface KeyboardHideEvent {
  /** Animation duration in milliseconds (iOS) */
  animationDuration?: number
  /** Animation curve (iOS) */
  animationCurve?: string
}

/**
 * Keyboard resize mode
 */
export type KeyboardResizeMode =
  | 'body' // Resize the body element
  | 'native' // Native resize (default)
  | 'ionic' // Ionic-specific resize
  | 'none' // No automatic resize

/**
 * Keyboard style (iOS)
 */
export type KeyboardStyle = 'dark' | 'light' | 'default'

/**
 * Keyboard accessory bar visibility
 */
export interface AccessoryBarOptions {
  /** Show/hide accessory bar (iOS) */
  visible: boolean
}

/**
 * Keyboard scroll options
 */
export interface KeyboardScrollOptions {
  /** Enable scroll to input on focus */
  enabled: boolean
  /** Extra padding above keyboard */
  padding?: number
}

/**
 * Keyboard capabilities
 */
export interface KeyboardCapabilities {
  /** Whether keyboard control is supported */
  supported: boolean
  /** Whether programmatic show/hide is supported */
  canShowHide: boolean
  /** Whether resize mode can be set */
  canSetResizeMode: boolean
  /** Whether style can be set (iOS) */
  canSetStyle: boolean
  /** Whether accessory bar can be controlled */
  canControlAccessoryBar: boolean
  /** Whether scroll behavior can be controlled */
  canControlScroll: boolean
}

/**
 * Keyboard provider interface
 */
export interface KeyboardProvider {
  /**
   * Show the keyboard
   */
  show(): Promise<void>

  /**
   * Hide the keyboard
   */
  hide(): Promise<void>

  /**
   * Toggle keyboard visibility
   */
  toggle(): Promise<void>

  /**
   * Get current keyboard state
   */
  getState(): Promise<KeyboardState>

  /**
   * Check if keyboard is visible
   */
  isVisible(): Promise<boolean>

  /**
   * Set resize mode
   * @param mode - How the app should resize when keyboard appears
   */
  setResizeMode(mode: KeyboardResizeMode): Promise<void>

  /**
   * Set keyboard style (iOS)
   * @param style - Keyboard color scheme
   */
  setStyle(style: KeyboardStyle): Promise<void>

  /**
   * Set accessory bar visibility (iOS)
   * @param options - Accessory bar options
   */
  setAccessoryBar(options: AccessoryBarOptions): Promise<void>

  /**
   * Set scroll behavior
   * @param options - Scroll options
   */
  setScroll(options: KeyboardScrollOptions): Promise<void>

  /**
   * Listen for keyboard show events
   * @param callback - Called when keyboard is shown
   * @returns Unsubscribe function
   */
  onShow(callback: (event: KeyboardShowEvent) => void): () => void

  /**
   * Listen for keyboard hide events
   * @param callback - Called when keyboard is hidden
   * @returns Unsubscribe function
   */
  onHide(callback: (event: KeyboardHideEvent) => void): () => void

  /**
   * Listen for keyboard height changes
   * @param callback - Called when keyboard height changes
   * @returns Unsubscribe function
   */
  onHeightChange?(callback: (height: number) => void): () => void

  /**
   * Get the platform's keyboard control capabilities.
   * @returns The capabilities indicating which keyboard features are supported.
   */
  getCapabilities(): Promise<KeyboardCapabilities>
}
