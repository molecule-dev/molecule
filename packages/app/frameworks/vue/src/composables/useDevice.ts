/**
 * Vue composable for device information.
 *
 * @module
 */

import type { DeviceInfo, FeatureSupport, HardwareInfo, ScreenInfo } from '@molecule/app-device'
import { getProvider } from '@molecule/app-device'

/**
 * Return type for the useDevice composable.
 */
export interface UseDeviceReturn {
  deviceInfo: DeviceInfo
  screenInfo: ScreenInfo
  hardwareInfo: HardwareInfo
  featureSupport: FeatureSupport
  supports: (feature: keyof FeatureSupport) => boolean
  isOnline: () => boolean
  isStandalone: () => boolean
  language: string
  languages: string[]
}

/**
 * Composable for device information.
 *
 * Uses module-level getProvider() from `@molecule/app-device` (singleton).
 * Static — no reactivity needed. Just calls provider methods and returns plain values.
 *
 * @returns Device information and utility methods
 *
 * @example
 * ```vue
 * <script setup>
 * import { useDevice } from '`@molecule/app-vue`'
 *
 * const { deviceInfo, screenInfo, supports, isOnline } = useDevice()
 * </script>
 *
 * <template>
 *   <p>{{ deviceInfo.browser.name }} on {{ deviceInfo.os.name }}</p>
 *   <p v-if="supports('pushNotifications')">Push supported</p>
 *   <p>{{ isOnline() ? 'Online' : 'Offline' }}</p>
 * </template>
 * ```
 */
export function useDevice(): UseDeviceReturn {
  const provider = getProvider()

  return {
    deviceInfo: provider.getDeviceInfo(),
    screenInfo: provider.getScreenInfo(),
    hardwareInfo: provider.getHardwareInfo(),
    featureSupport: provider.getFeatureSupport(),
    supports: (feature: keyof FeatureSupport) => provider.supports(feature),
    isOnline: () => provider.isOnline(),
    isStandalone: () => provider.isStandalone(),
    language: provider.getLanguage(),
    languages: provider.getLanguages(),
  }
}
