/**
 * Vue composable for platform detection.
 *
 * @module
 */

import type { Platform, PlatformInfo } from '@molecule/app-platform'
import { isPlatform, platform } from '@molecule/app-platform'

/**
 * Return type for the usePlatform composable.
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
 * The former name of {@link UsePlatformResult}.
 *
 * @deprecated Renamed to {@link UsePlatformResult}, `@molecule/app-react`'s name for it.
 */
export type UsePlatformReturn = UsePlatformResult

/**
 * Composable for platform detection.
 *
 * Uses module-level platform() and isPlatform() from `@molecule/app-platform` (singleton).
 * Static — no reactivity needed.
 *
 * @returns Platform information and utility methods
 *
 * @example
 * ```vue
 * <script setup>
 * import { usePlatform } from '@molecule/app-vue'
 *
 * const { platform, isNative, isMobile, isPlatform } = usePlatform()
 * </script>
 *
 * <template>
 *   <p>Platform: {{ platform }}</p>
 *   <p v-if="isMobile">Mobile device</p>
 *   <p v-if="isPlatform('ios', 'android')">Native mobile</p>
 * </template>
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
