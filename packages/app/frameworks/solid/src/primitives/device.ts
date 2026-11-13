/**
 * Solid.js primitives for device information.
 *
 * @module
 */

import type { DeviceInfo, FeatureSupport, HardwareInfo, ScreenInfo } from '@molecule/app-device'
import { getProvider } from '@molecule/app-device'

/**
 * Device primitives return type.
 */
export interface DevicePrimitives {
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
 * Create device primitives for accessing device information.
 *
 * This is a static primitive (no reactive signals) since device info
 * does not change during the lifecycle of the app.
 *
 * @returns Device primitives object
 *
 * @example
 * ```tsx
 * import { createDevice } from '@molecule/app-solid'
 *
 * function DeviceDetails() {
 *   const { deviceInfo, screenInfo, supports } = createDevice()
 *
 *   return (
 *     <div>
 *       <p>Browser: {deviceInfo.browser.name}</p>
 *       <p>OS: {deviceInfo.os.name}</p>
 *       <p>Screen: {screenInfo.width}x{screenInfo.height}</p>
 *       <p>Push supported: {supports('pushNotifications') ? 'Yes' : 'No'}</p>
 *     </div>
 *   )
 * }
 * ```
 */
export function createDevice(): DevicePrimitives {
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

/**
 * Device information, React's `useDevice` under the same name: one static
 * snapshot of the bonded device provider (`supports`, `isOnline` and
 * `isStandalone` stay live functions reading the provider).
 *
 * @returns Device information and utility methods
 *
 * @example
 * ```tsx
 * function LayoutPicker() {
 *   const { deviceInfo } = useDevice()
 *   return deviceInfo.isMobile ? <MobileLayout /> : <DesktopLayout />
 * }
 * ```
 */
export const useDevice: () => DevicePrimitives = createDevice
