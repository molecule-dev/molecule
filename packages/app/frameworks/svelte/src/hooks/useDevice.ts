/**
 * Svelte hook for device information, porting React's `useDevice`.
 *
 * @module
 */

import type { DeviceInfo, FeatureSupport, HardwareInfo, ScreenInfo } from '@molecule/app-device'
import { getProvider } from '@molecule/app-device'

/**
 * Hook return type.
 */
export interface UseDeviceResult {
  /** The parsed device identity. */
  deviceInfo: DeviceInfo
  /** The screen dimensions and mode. */
  screenInfo: ScreenInfo
  /** The hardware capabilities. */
  hardwareInfo: HardwareInfo
  /** The feature flags. */
  featureSupport: FeatureSupport
  /** Whether a feature is supported. */
  supports: (feature: keyof FeatureSupport) => boolean
  /** Whether the device is online. */
  isOnline: () => boolean
  /** Whether the app runs standalone. */
  isStandalone: () => boolean
  /** The preferred language. */
  language: string
  /** The preferred languages, best first. */
  languages: string[]
}

/**
 * Device information and utility methods, React's `useDevice` in Svelte's
 * idiom: called during component init; device info is static, so the result is
 * a plain object (nothing reactive).
 *
 * Uses module-level `getProvider()` — device info is a singleton, not
 * context-provided.
 *
 * @returns Device information and utility methods.
 * @example
 * ```svelte
 * <script>
 *   import { useDevice } from '@molecule/app-svelte'
 *   const { deviceInfo, screenInfo, supports } = useDevice()
 * </script>
 * ```
 */
export function useDevice(): UseDeviceResult {
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
