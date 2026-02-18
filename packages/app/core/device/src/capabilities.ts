/**
 * Feature detection logic for device capabilities.
 *
 * @module
 */

import type { FeatureSupport, HardwareInfo, ScreenInfo } from './types.js'

/**
 * Detects screen information from browser APIs (window.screen,
 * devicePixelRatio, media queries). Returns sensible defaults
 * in non-browser environments.
 *
 * @returns A `ScreenInfo` object with dimensions, pixel ratio, and dark mode status.
 */
export const detectScreenInfo = (): ScreenInfo => {
  if (typeof window === 'undefined') {
    return {
      width: 0,
      height: 0,
      availableWidth: 0,
      availableHeight: 0,
      pixelRatio: 1,
      colorDepth: 24,
      orientation: 'portrait',
      isDarkMode: false,
    }
  }

  const isDarkMode = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false

  return {
    width: window.screen?.width || 0,
    height: window.screen?.height || 0,
    availableWidth: window.screen?.availWidth || 0,
    availableHeight: window.screen?.availHeight || 0,
    pixelRatio: window.devicePixelRatio || 1,
    colorDepth: window.screen?.colorDepth || 24,
    orientation:
      window.screen?.orientation?.type?.includes('portrait') ||
      window.innerHeight > window.innerWidth
        ? 'portrait'
        : 'landscape',
    isDarkMode,
  }
}

/**
 * Detects hardware information including CPU cores, memory,
 * touch support, and WebGL capabilities.
 *
 * @returns A `HardwareInfo` object with CPU, memory, and GPU details.
 */
export const detectHardwareInfo = (): HardwareInfo => {
  let hasWebGL = false
  let webGLRenderer: string | undefined

  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      if (gl) {
        hasWebGL = true
        const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info')
        if (debugInfo) {
          webGLRenderer = (gl as WebGLRenderingContext).getParameter(
            debugInfo.UNMASKED_RENDERER_WEBGL,
          )
        }
      }
    } catch {
      // WebGL not supported
    }
  }

  return {
    cpuCores: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 1 : 1,
    memory:
      typeof navigator !== 'undefined'
        ? (navigator as { deviceMemory?: number }).deviceMemory
        : undefined,
    maxTouchPoints: typeof navigator !== 'undefined' ? navigator.maxTouchPoints || 0 : 0,
    hasWebGL,
    webGLRenderer,
  }
}

/**
 * Detects browser feature support by checking for the presence of
 * APIs like Service Worker, Push, Geolocation, WebAuthn, etc.
 *
 * @returns A `FeatureSupport` object with boolean flags for each feature.
 */
export const detectFeatureSupport = (): FeatureSupport => {
  const hasWindow = typeof window !== 'undefined'
  const hasNavigator = typeof navigator !== 'undefined'
  const hasDocument = typeof document !== 'undefined'

  return {
    serviceWorker: hasNavigator && 'serviceWorker' in navigator,
    pushNotifications:
      hasNavigator && 'serviceWorker' in navigator && hasWindow && 'PushManager' in window,
    webShare: hasNavigator && 'share' in navigator,
    geolocation: hasNavigator && 'geolocation' in navigator,
    mediaDevices: hasNavigator && 'mediaDevices' in navigator,
    bluetooth: hasNavigator && 'bluetooth' in navigator,
    nfc: hasWindow && 'NDEFReader' in window,
    vibration: hasNavigator && 'vibrate' in navigator,
    webUSB: hasNavigator && 'usb' in navigator,
    webSerial: hasNavigator && 'serial' in navigator,
    webAuthn:
      hasNavigator && 'credentials' in navigator && hasWindow && 'PublicKeyCredential' in window,
    indexedDB: hasWindow && 'indexedDB' in window,
    localStorage: hasWindow && 'localStorage' in window,
    webSocket: hasWindow && 'WebSocket' in window,
    fullscreen:
      (hasDocument && 'fullscreenEnabled' in document) ||
      (hasDocument && 'webkitFullscreenEnabled' in document),
    pictureInPicture: hasDocument && 'pictureInPictureEnabled' in document,
    crypto: hasWindow && 'crypto' in window && 'subtle' in window.crypto,
    clipboard: hasNavigator && 'clipboard' in navigator,
  }
}
