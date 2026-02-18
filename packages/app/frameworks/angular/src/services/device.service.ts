/**
 * Angular device service for accessing device information.
 *
 * @module
 */
import type { DeviceInfo, FeatureSupport, HardwareInfo, ScreenInfo } from '@molecule/app-device'
import { getProvider } from '@molecule/app-device'

/**
 * Device service interface.
 */
export interface DeviceService {
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
 * Creates an Angular device service with static device information.
 *
 * @returns Device service with device, screen, hardware, and feature info
 *
 * @example
 * ```typescript
 * const device = createDeviceService()
 *
 * console.log(device.deviceInfo.browser.name)
 * console.log(device.supports('pushNotifications'))
 * ```
 */
export const createDeviceService = (): DeviceService => {
  const provider = getProvider()

  return {
    deviceInfo: provider.getDeviceInfo(),
    screenInfo: provider.getScreenInfo(),
    hardwareInfo: provider.getHardwareInfo(),
    featureSupport: provider.getFeatureSupport(),
    supports: (feature) => provider.supports(feature),
    isOnline: () => provider.isOnline(),
    isStandalone: () => provider.isStandalone(),
    language: provider.getLanguage(),
    languages: provider.getLanguages(),
  }
}
