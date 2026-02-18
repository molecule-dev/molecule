/**
 * Utility functions for device information.
 *
 * @module
 */

import { getProvider } from './provider.js'
import type { DeviceInfo, FeatureSupport, HardwareInfo, ScreenInfo } from './types.js'

/**
 * Returns parsed user-agent data including browser, OS, and device type.
 *
 * @returns The current device information from the bonded provider.
 */
export const getDeviceInfo = (): DeviceInfo => getProvider().getDeviceInfo()

/**
 * Returns screen dimensions, pixel ratio, color depth, orientation, and dark mode preference.
 *
 * @returns The current screen information from the bonded provider.
 */
export const getScreenInfo = (): ScreenInfo => getProvider().getScreenInfo()

/**
 * Returns CPU cores, memory, touch points, and WebGL capabilities.
 *
 * @returns The current hardware information from the bonded provider.
 */
export const getHardwareInfo = (): HardwareInfo => getProvider().getHardwareInfo()

/**
 * Returns boolean flags for all detectable browser features (Service Worker, Push, Bluetooth, etc.).
 *
 * @returns The feature support map from the bonded provider.
 */
export const getFeatureSupport = (): FeatureSupport => getProvider().getFeatureSupport()

/**
 * Checks whether a specific browser feature is supported.
 *
 * @param feature - The feature key to check (e.g. `'serviceWorker'`, `'webAuthn'`, `'bluetooth'`).
 * @returns `true` if the browser supports the specified feature.
 */
export const supports = (feature: keyof FeatureSupport): boolean => getProvider().supports(feature)

/**
 * Returns the raw user-agent string from the browser.
 *
 * @returns The `navigator.userAgent` string.
 */
export const getUserAgent = (): string => getProvider().getUserAgent()

/**
 * Returns the platform identifier (e.g. `'Win32'`, `'MacIntel'`, `'Linux x86_64'`).
 *
 * @returns The `navigator.platform` string.
 */
export const getPlatform = (): string => getProvider().getPlatform()

/**
 * Returns the browser's preferred language (e.g. `'en-US'`).
 *
 * @returns The `navigator.language` string.
 */
export const getLanguage = (): string => getProvider().getLanguage()

/**
 * Checks whether the device currently has a network connection.
 *
 * @returns `true` if the browser reports being online.
 */
export const isOnline = (): boolean => getProvider().isOnline()

/**
 * Checks whether the app is running in standalone mode (installed PWA).
 *
 * @returns `true` if the app was launched from the home screen or app launcher.
 */
export const isStandalone = (): boolean => getProvider().isStandalone()
