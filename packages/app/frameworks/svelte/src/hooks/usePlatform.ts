/**
 * Svelte hook for platform detection, porting React's `usePlatform`.
 *
 * @module
 */

import type { Platform } from '@molecule/app-platform'
import { isPlatform, platform } from '@molecule/app-platform'

/**
 * Hook return type.
 */
export interface UsePlatformResult {
  /** The detected platform. */
  platform: Platform
  /** Whether the app runs in a native shell. */
  isNative: boolean
  /** Whether the platform is a phone or tablet. */
  isMobile: boolean
  /** Whether the platform is a desktop. */
  isDesktop: boolean
  /** Whether the platform is the web. */
  isWeb: boolean
  /** Whether the app runs in development. */
  isDevelopment: boolean
  /** Whether the app runs in production. */
  isProduction: boolean
  /** Whether the current platform is one of the candidates. */
  isPlatform: (...platforms: Platform[]) => boolean
}

/**
 * Detected platform info plus the `isPlatform` helper, React's `usePlatform`
 * in Svelte's idiom: called during component init; platform info is static, so
 * the result is a plain object (nothing reactive).
 *
 * Uses module-level functions — platform is a singleton, not context-provided.
 *
 * @returns Platform information and utility methods.
 * @example
 * ```svelte
 * <script>
 *   import { usePlatform } from '@molecule/app-svelte'
 *   const { isWeb, isMobile, isPlatform } = usePlatform()
 * </script>
 * ```
 */
export function usePlatform(): UsePlatformResult {
  const info = platform()
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
}
