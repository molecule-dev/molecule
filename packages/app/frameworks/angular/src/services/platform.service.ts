/**
 * Angular platform service for accessing platform information.
 *
 * @module
 */
import type { Platform, PlatformInfo } from '@molecule/app-platform'
import { getPlatformInfo, isPlatform } from '@molecule/app-platform'

/**
 * Platform service interface.
 */
export interface PlatformService {
  platform: Platform
  isNative: boolean
  isMobile: boolean
  isDesktop: boolean
  isWeb: boolean
  isDevelopment: boolean
  isProduction: boolean
  isPlatform: (...platforms: Platform[]) => boolean
}

/**
 * Creates an Angular platform service with static platform information.
 *
 * @returns Platform service with platform flags and isPlatform check
 *
 * @example
 * ```typescript
 * const platform = createPlatformService()
 *
 * if (platform.isMobile) {
 *   console.log('Running on mobile')
 * }
 *
 * if (platform.isPlatform('ios', 'android')) {
 *   console.log('Running on iOS or Android')
 * }
 * ```
 */
export const createPlatformService = (): PlatformService => {
  const info: PlatformInfo = getPlatformInfo()

  return {
    platform: info.platform,
    isNative: info.isNative,
    isMobile: info.isMobile,
    isDesktop: info.isDesktop,
    isWeb: info.isWeb,
    isDevelopment: info.isDevelopment,
    isProduction: info.isProduction,
    isPlatform: (...platforms) => isPlatform(...platforms),
  }
}
