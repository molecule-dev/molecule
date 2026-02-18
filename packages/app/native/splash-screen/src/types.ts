/**
 * `@molecule/app-splash-screen`
 * Type definitions for splash screen module.
 */

/**
 * Splash screen show options
 */
export interface SplashScreenShowOptions {
  /** Whether to auto-hide after showDuration */
  autoHide?: boolean
  /** Duration in milliseconds before auto-hide */
  showDuration?: number
  /** Fade in duration in milliseconds */
  fadeInDuration?: number
  /** Fade out duration in milliseconds */
  fadeOutDuration?: number
}

/**
 * Splash screen hide options
 */
export interface SplashScreenHideOptions {
  /** Fade out duration in milliseconds */
  fadeOutDuration?: number
}

/**
 * Splash screen configuration
 */
export interface SplashScreenConfig {
  /** Background color */
  backgroundColor?: string
  /** Show spinner */
  showSpinner?: boolean
  /** Spinner color */
  spinnerColor?: string
  /** Android spinner style */
  androidSpinnerStyle?: 'horizontal' | 'small' | 'large'
  /** iOS spinner style */
  iosSpinnerStyle?: 'small' | 'large'
  /** Whether to auto-hide on app ready */
  autoHide?: boolean
  /** Duration in milliseconds before auto-hide */
  showDuration?: number
  /** Fade in duration in milliseconds */
  fadeInDuration?: number
  /** Fade out duration in milliseconds */
  fadeOutDuration?: number
  /** Scale mode for splash image */
  scaleMode?: 'fill' | 'aspectFill' | 'aspectFit' | 'center'
  /** Launch show duration (iOS) */
  launchShowDuration?: number
  /** Launch auto hide (iOS) */
  launchAutoHide?: boolean
}

/**
 * Splash screen state
 */
export interface SplashScreenState {
  /** Whether splash screen is currently visible */
  visible: boolean
  /** Whether currently animating */
  animating: boolean
}

/**
 * Splash screen capabilities
 */
export interface SplashScreenCapabilities {
  /** Whether splash screen control is supported */
  supported: boolean
  /** Whether spinner is supported */
  spinnerSupported: boolean
  /** Whether configuration is supported */
  configurable: boolean
  /** Whether background color can be changed */
  dynamicBackground: boolean
}

/**
 * Splash screen provider interface
 */
export interface SplashScreenProvider {
  /**
   * Show the splash screen
   * @param options - Show options
   */
  show(options?: SplashScreenShowOptions): Promise<void>

  /**
   * Hide the splash screen
   * @param options - Hide options
   */
  hide(options?: SplashScreenHideOptions): Promise<void>

  /**
   * Get current splash screen state
   */
  getState(): Promise<SplashScreenState>

  /**
   * Check if splash screen is visible
   */
  isVisible(): Promise<boolean>

  /**
   * Configure splash screen settings
   * @param config - Configuration options
   */
  configure?(config: SplashScreenConfig): Promise<void>

  /**
   * Get the platform's splash screen capabilities.
   * @returns The capabilities indicating splash screen control, spinner, and configuration support.
   */
  getCapabilities(): Promise<SplashScreenCapabilities>
}
