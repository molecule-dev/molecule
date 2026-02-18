/**
 * React hook for platform detection.
 *
 * @module
 */

import { useMemo } from 'react'

import type { Platform, PlatformInfo } from '@molecule/app-platform'
import { isPlatform, platform } from '@molecule/app-platform'

/**
 * Hook return type.
 */
export interface UsePlatformResult {
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
 * Hook for platform detection.
 *
 * Uses module-level functions — platform is a singleton, not context-provided.
 * Platform info is static and doesn't change at runtime, so this uses `useMemo`.
 *
 * @returns Platform information and utility methods
 *
 * @example
 * ```tsx
 * const { isWeb, isMobile, isPlatform } = usePlatform()
 *
 * if (isPlatform('ios', 'android')) {
 *   return <NativeLayout />
 * }
 * ```
 */
export function usePlatform(): UsePlatformResult {
  return useMemo(() => {
    const info: PlatformInfo = platform()

    return {
      platform: info.platform,
      isNative: info.isNative,
      isMobile: info.isMobile,
      isDesktop: info.isDesktop,
      isWeb: info.isWeb,
      isDevelopment: info.isDevelopment,
      isProduction: info.isProduction,
      isPlatform: (...platforms: Platform[]) => isPlatform(...platforms),
    }
  }, [])
}
