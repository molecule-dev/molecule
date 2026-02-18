/**
 * Type definitions for platform detection.
 *
 * @module
 */

/**
 * Target runtime platforms: web, ios, android, electron, macos, windows, linux.
 */
export type Platform = 'web' | 'ios' | 'android' | 'electron' | 'macos' | 'windows' | 'linux'

/**
 * Detected runtime environment details (platform, native/mobile/desktop/web flags, dev/prod mode).
 */
export interface PlatformInfo {
  /**
   * The current platform.
   */
  platform: Platform

  /**
   * Whether running in a native app (Capacitor, React Native, Electron).
   */
  isNative: boolean

  /**
   * Whether running in a mobile app (iOS or Android).
   */
  isMobile: boolean

  /**
   * Whether running in a desktop app (Electron, macOS, Windows, Linux).
   */
  isDesktop: boolean

  /**
   * Whether running in a web browser.
   */
  isWeb: boolean

  /**
   * Whether running in development mode.
   */
  isDevelopment: boolean

  /**
   * Whether running in production mode.
   */
  isProduction: boolean

  /**
   * The user agent string (if available).
   */
  userAgent?: string

  /**
   * The app version (if available).
   */
  appVersion?: string
}
