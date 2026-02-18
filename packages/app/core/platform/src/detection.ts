/**
 * Platform detection utilities.
 *
 * Detects the runtime platform (web, iOS, Android, Electron, etc.)
 * by inspecting Capacitor, Electron, React Native, and browser APIs.
 *
 * @module
 */

import type { Platform, PlatformInfo } from './types.js'

/**
 * Detects the current runtime platform by checking for Capacitor,
 * Electron, React Native, and falling back to `'web'`.
 *
 * @returns The detected platform identifier.
 */
export const detectPlatform = (): Platform => {
  // Check for Capacitor
  if (
    typeof window !== 'undefined' &&
    (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor?.getPlatform
  ) {
    const cap = (window as unknown as { Capacitor: { getPlatform: () => string } }).Capacitor
    const platform = cap.getPlatform()
    if (platform === 'ios') return 'ios'
    if (platform === 'android') return 'android'
  }

  // Check for Electron
  if (typeof window !== 'undefined' && (window as unknown as { electron?: unknown }).electron) {
    // Try to detect the OS in Electron
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase()
      if (ua.includes('mac')) return 'macos'
      if (ua.includes('win')) return 'windows'
      if (ua.includes('linux')) return 'linux'
    }
    return 'electron'
  }

  // Check for React Native
  if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
    // React Native - check platform
    const ua = navigator.userAgent?.toLowerCase() ?? ''
    if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) return 'ios'
    if (ua.includes('android')) return 'android'
  }

  // Web browser detection
  if (typeof navigator !== 'undefined' && navigator.userAgent) {
    const ua = navigator.userAgent.toLowerCase()
    // Mobile web browsers
    if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
      // iOS Safari/WebView - but still web
      return 'web'
    }
    if (ua.includes('android')) {
      // Android browser - but still web
      return 'web'
    }
  }

  return 'web'
}

/**
 * Builds comprehensive platform information including platform type,
 * environment flags, and user agent details.
 *
 * @param env - Optional environment overrides for development/production flags.
 * @param env.isDevelopment - Override for development mode detection.
 * @param env.isProduction - Override for production mode detection.
 * @returns A `PlatformInfo` object with all platform details.
 */
export const getPlatformInfo = (env?: {
  isDevelopment?: boolean
  isProduction?: boolean
}): PlatformInfo => {
  const platform = detectPlatform()
  const isNative =
    ['ios', 'android', 'electron', 'macos', 'windows', 'linux'].includes(platform) &&
    platform !== 'web'
  const isMobile = ['ios', 'android'].includes(platform)
  const isDesktop = ['electron', 'macos', 'windows', 'linux'].includes(platform)
  const isWeb = platform === 'web'

  return {
    platform,
    isNative,
    isMobile,
    isDesktop,
    isWeb,
    isDevelopment:
      env?.isDevelopment ??
      (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development'),
    isProduction:
      env?.isProduction ??
      (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production'),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    appVersion: typeof process !== 'undefined' ? process.env?.npm_package_version : undefined,
  }
}

/**
 * Current platform info (cached).
 */
let cachedPlatformInfo: PlatformInfo | null = null

/**
 * Returns the current platform info, caching the result after first call.
 *
 * @returns The cached `PlatformInfo` object.
 */
export const platform = (): PlatformInfo => {
  if (!cachedPlatformInfo) {
    cachedPlatformInfo = getPlatformInfo()
  }
  return cachedPlatformInfo
}

/**
 * Resets the cached platform info. Useful for testing or when the
 * platform context changes.
 */
export const resetPlatformCache = (): void => {
  cachedPlatformInfo = null
}
