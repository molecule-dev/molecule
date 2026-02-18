/**
 * Svelte stores for device information.
 *
 * @module
 */

import type { DeviceInfo, FeatureSupport, HardwareInfo, ScreenInfo } from '@molecule/app-device'
import { getProvider } from '@molecule/app-device'

/**
 * Create device stores from the module-level device provider.
 *
 * Device information is static (no reactive subscription needed),
 * so this returns plain values rather than Svelte stores.
 *
 * @returns Device information and utility functions
 *
 * @example
 * ```svelte
 * <script>
 *   import { createDeviceStores } from '`@molecule/app-svelte`'
 *
 *   const { deviceInfo, screenInfo, supports } = createDeviceStores()
 * </script>
 *
 * <p>Browser: {deviceInfo.browser.name}</p>
 * <p>Screen: {screenInfo.width}x{screenInfo.height}</p>
 * <p>Push supported: {supports('pushNotifications')}</p>
 * ```
 */
export function createDeviceStores(): {
  deviceInfo: DeviceInfo
  screenInfo: ScreenInfo
  hardwareInfo: HardwareInfo
  featureSupport: FeatureSupport
  supports: (feature: keyof FeatureSupport) => boolean
  isOnline: () => boolean
  isStandalone: () => boolean
  language: string
  languages: string[]
} {
  const provider = getProvider()

  const deviceInfo: DeviceInfo = provider.getDeviceInfo()
  const screenInfo: ScreenInfo = provider.getScreenInfo()
  const hardwareInfo: HardwareInfo = provider.getHardwareInfo()
  const featureSupport: FeatureSupport = provider.getFeatureSupport()

  const supports = (feature: keyof FeatureSupport): boolean => provider.supports(feature)
  const isOnline = (): boolean => provider.isOnline()
  const isStandalone = (): boolean => provider.isStandalone()

  const language: string = provider.getLanguage()
  const languages: string[] = provider.getLanguages()

  return {
    deviceInfo,
    screenInfo,
    hardwareInfo,
    featureSupport,
    supports,
    isOnline,
    isStandalone,
    language,
    languages,
  }
}
