/**
 * React hook for device information.
 *
 * @module
 */

import { useMemo } from 'react'

import type { DeviceInfo, FeatureSupport, HardwareInfo, ScreenInfo } from '@molecule/app-device'
import { getProvider } from '@molecule/app-device'

/**
 * Hook return type.
 */
export interface UseDeviceResult {
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
 * Hook for device information.
 *
 * Uses module-level `getProvider()` — device info is a singleton, not context-provided.
 * Device info is static and doesn't change at runtime, so this uses `useMemo`.
 *
 * @returns Device information and utility methods
 *
 * @example
 * ```tsx
 * const { deviceInfo, screenInfo, supports } = useDevice()
 *
 * if (deviceInfo.isMobile) {
 *   return <MobileLayout />
 * }
 * ```
 */
export function useDevice(): UseDeviceResult {
  return useMemo(() => {
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
  }, [])
}
