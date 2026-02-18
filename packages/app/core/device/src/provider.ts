/**
 * Device information bond accessor and built-in web provider.
 *
 * Provides a default web-based device provider that uses the browser's
 * `navigator` and `screen` APIs. If no custom provider is bonded, the
 * built-in web provider is auto-created on first access.
 *
 * @module
 */

import { detectFeatureSupport, detectHardwareInfo, detectScreenInfo } from './capabilities.js'
import { parseUserAgent } from './detection.js'
import type {
  DeviceInfo,
  DeviceProvider,
  FeatureSupport,
  HardwareInfo,
  ScreenInfo,
} from './types.js'

/**
 * Creates a web-based device provider that reads device, screen, hardware,
 * and feature information from browser APIs. Results are cached except for
 * screen info, which is refreshed on every call since it can change.
 *
 * @returns A `DeviceProvider` backed by browser APIs.
 */
export const createWebDeviceProvider = (): DeviceProvider => {
  let cachedDeviceInfo: DeviceInfo | null = null
  let cachedScreenInfo: ScreenInfo | null = null
  let cachedHardwareInfo: HardwareInfo | null = null
  let cachedFeatureSupport: FeatureSupport | null = null

  return {
    getDeviceInfo(): DeviceInfo {
      if (!cachedDeviceInfo) {
        cachedDeviceInfo =
          typeof navigator !== 'undefined'
            ? parseUserAgent(navigator.userAgent)
            : parseUserAgent('')
      }
      return cachedDeviceInfo
    },

    getScreenInfo(): ScreenInfo {
      // Always refresh screen info as it can change
      cachedScreenInfo = detectScreenInfo()
      return cachedScreenInfo
    },

    getHardwareInfo(): HardwareInfo {
      if (!cachedHardwareInfo) {
        cachedHardwareInfo = detectHardwareInfo()
      }
      return cachedHardwareInfo
    },

    getFeatureSupport(): FeatureSupport {
      if (!cachedFeatureSupport) {
        cachedFeatureSupport = detectFeatureSupport()
      }
      return cachedFeatureSupport
    },

    supports(feature: keyof FeatureSupport): boolean {
      return this.getFeatureSupport()[feature]
    },

    getUserAgent(): string {
      return typeof navigator !== 'undefined' ? navigator.userAgent : ''
    },

    getPlatform(): string {
      return typeof navigator !== 'undefined' ? navigator.platform || 'unknown' : 'unknown'
    },

    getLanguage(): string {
      return typeof navigator !== 'undefined' ? navigator.language || 'en' : 'en'
    },

    getLanguages(): string[] {
      return typeof navigator !== 'undefined'
        ? navigator.languages?.slice() || [this.getLanguage()]
        : ['en']
    },

    isOnline(): boolean {
      return typeof navigator !== 'undefined' ? (navigator.onLine ?? true) : true
    },

    isStandalone(): boolean {
      if (typeof window === 'undefined') return false
      return (
        window.matchMedia?.('(display-mode: standalone)').matches ||
        (typeof navigator !== 'undefined' &&
          (navigator as { standalone?: boolean }).standalone === true) ||
        (typeof document !== 'undefined' && document.referrer.includes('android-app://'))
      )
    },
  }
}

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'

const BOND_TYPE = 'device'

/**
 * Registers a device provider as the active singleton.
 *
 * @param provider - The device provider implementation to bond.
 */
export const setProvider = (provider: DeviceProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded device provider. If none is bonded, automatically
 * creates and bonds the built-in web device provider.
 *
 * @returns The active device provider.
 */
export const getProvider = (): DeviceProvider => {
  if (!isBonded(BOND_TYPE)) {
    bond(BOND_TYPE, createWebDeviceProvider())
  }
  return bondGet<DeviceProvider>(BOND_TYPE)!
}

/**
 * Checks whether a device provider has been explicitly bonded.
 *
 * @returns `true` if a device provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}
