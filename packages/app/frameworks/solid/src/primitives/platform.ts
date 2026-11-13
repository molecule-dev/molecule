/**
 * Solid.js primitives for platform detection.
 *
 * @module
 */

import type { Platform, PlatformInfo } from '@molecule/app-platform'
import { isPlatform, platform } from '@molecule/app-platform'

/**
 * Platform primitives return type.
 */
export interface PlatformPrimitives {
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
 * Create platform primitives for detecting the current platform.
 *
 * This is a static primitive (no reactive signals) since the platform
 * does not change during the lifecycle of the app.
 *
 * @returns Platform primitives object
 *
 * @example
 * ```tsx
 * import { createPlatform } from '@molecule/app-solid'
 *
 * function PlatformInfo() {
 *   const { platform, isWeb, isMobile, isPlatform } = createPlatform()
 *
 *   return (
 *     <div>
 *       <p>Platform: {platform}</p>
 *       <p>Is Web: {isWeb ? 'Yes' : 'No'}</p>
 *       <Show when={isPlatform('ios', 'android')}>
 *         <p>Running on mobile native</p>
 *       </Show>
 *     </div>
 *   )
 * }
 * ```
 */
export function createPlatform(): PlatformPrimitives {
  const info = platform()

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

/**
 * What {@link usePlatform} returns (the same names React returns).
 */
export interface UsePlatformResult {
  /** The detected platform. */
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
 * Platform detection, under React's hook name.
 *
 * Platform info is static and doesn't change at runtime; this reads the
 * module-singleton detection once per component.
 *
 * @returns Platform information and utility methods.
 * @example
 * ```tsx
 * const { isWeb, isMobile, isPlatform } = usePlatform()
 * ```
 */
export function usePlatform(): UsePlatformResult {
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
}
