/**
 * Svelte stores for platform detection.
 *
 * @module
 */

import type { Platform } from '@molecule/app-platform'
import { getPlatformInfo, isPlatform } from '@molecule/app-platform'

/**
 * Create platform stores from the module-level platform info.
 *
 * Platform information is static (no reactive subscription needed),
 * so this returns plain values rather than Svelte stores.
 *
 * @returns Platform information and utility functions
 *
 * @example
 * ```svelte
 * <script>
 *   import { createPlatformStores } from '`@molecule/app-svelte`'
 *
 *   const { platform, isNative, isMobile, isPlatform } = createPlatformStores()
 * </script>
 *
 * <p>Platform: {platform}</p>
 * {#if isMobile}
 *   <MobileLayout />
 * {:else}
 *   <DesktopLayout />
 * {/if}
 * ```
 */
export function createPlatformStores(): {
  platform: Platform
  isNative: boolean
  isMobile: boolean
  isDesktop: boolean
  isWeb: boolean
  isDevelopment: boolean
  isProduction: boolean
  isPlatform: (...platforms: Platform[]) => boolean
} {
  const info = getPlatformInfo()

  return {
    platform: info.platform,
    isNative: info.isNative,
    isMobile: info.isMobile,
    isDesktop: info.isDesktop,
    isWeb: info.isWeb,
    isDevelopment: info.isDevelopment,
    isProduction: info.isProduction,
    isPlatform: (...platforms: Platform[]): boolean => isPlatform(...platforms),
  }
}
