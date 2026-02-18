/**
 * `@molecule/app-status-bar`
 * Type definitions for status bar customization interface
 */

/**
 * Status bar style (content color)
 */
export type StatusBarStyle = 'dark' | 'light' | 'default'

/**
 * Status bar animation type
 */
export type StatusBarAnimation = 'none' | 'fade' | 'slide'

/**
 * Status bar configuration
 */
export interface StatusBarConfig {
  /** Background color (hex or named color) */
  backgroundColor?: string
  /** Content style (dark/light icons and text) */
  style?: StatusBarStyle
  /** Whether status bar is visible */
  visible?: boolean
  /** Whether content overlays status bar */
  overlaysWebView?: boolean
}

/**
 * Status bar state
 */
export interface StatusBarState {
  /** Whether status bar is visible */
  visible: boolean
  /** Current background color */
  backgroundColor: string
  /** Current content style */
  style: StatusBarStyle
  /** Whether content overlays status bar */
  overlaysWebView: boolean
  /** Status bar height in pixels */
  height: number
}

/**
 * Status bar capabilities
 */
export interface StatusBarCapabilities {
  /** Whether status bar control is supported */
  supported: boolean
  /** Whether background color can be set */
  canSetBackgroundColor: boolean
  /** Whether style can be set */
  canSetStyle: boolean
  /** Whether visibility can be controlled */
  canSetVisibility: boolean
  /** Whether overlay mode can be set */
  canSetOverlay: boolean
  /** Whether animations are supported */
  supportsAnimation: boolean
}

/**
 * Status bar provider interface
 */
export interface StatusBarProvider {
  /**
   * Set background color
   * @param color - Hex color (e.g., '#ffffff') or named color
   */
  setBackgroundColor(color: string): Promise<void>

  /**
   * Set content style (dark/light icons)
   * @param style - Status bar style
   */
  setStyle(style: StatusBarStyle): Promise<void>

  /**
   * Show the status bar
   * @param animation - Animation type (iOS)
   */
  show(animation?: StatusBarAnimation): Promise<void>

  /**
   * Hide the status bar
   * @param animation - Animation type (iOS)
   */
  hide(animation?: StatusBarAnimation): Promise<void>

  /**
   * Set whether content overlays the status bar
   * @param overlay - Whether to overlay
   */
  setOverlaysWebView(overlay: boolean): Promise<void>

  /**
   * Get current status bar state
   */
  getState(): Promise<StatusBarState>

  /**
   * Get status bar height
   */
  getHeight(): Promise<number>

  /**
   * Apply multiple settings at once
   * @param config - Status bar configuration
   */
  configure(config: StatusBarConfig): Promise<void>

  /**
   * Get the platform's status bar capabilities.
   * @returns The capabilities indicating which status bar features are supported.
   */
  getCapabilities(): Promise<StatusBarCapabilities>
}
