/**
 * Type definitions for device information.
 *
 * @module
 */

/**
 * Parsed browser identity (name, version, rendering engine).
 */
export interface BrowserInfo {
  /**
   * Browser name.
   */
  name: string

  /**
   * Browser version.
   */
  version: string

  /**
   * Browser major version.
   */
  majorVersion: number

  /**
   * Browser engine (WebKit, Blink, Gecko, etc.).
   */
  engine?: string

  /**
   * Engine version.
   */
  engineVersion?: string
}

/**
 * Operating system information.
 */
export interface OSInfo {
  /**
   * OS name.
   */
  name: string

  /**
   * OS version.
   */
  version: string

  /**
   * OS family (Windows, macOS, Linux, iOS, Android, etc.).
   */
  family: string
}

/**
 * Parsed device identity (browser, OS, form factor, vendor, model, touch support).
 */
export interface DeviceInfo {
  /**
   * Full device name (OS + Browser).
   */
  name: string

  /**
   * Browser information.
   */
  browser: BrowserInfo

  /**
   * Operating system information.
   */
  os: OSInfo

  /**
   * Whether the device is mobile.
   */
  isMobile: boolean

  /**
   * Whether the device is a tablet.
   */
  isTablet: boolean

  /**
   * Whether the device is a desktop.
   */
  isDesktop: boolean

  /**
   * Device type.
   */
  type: 'mobile' | 'tablet' | 'desktop' | 'unknown'

  /**
   * Device vendor (Apple, Samsung, etc.).
   */
  vendor?: string

  /**
   * Device model (iPhone, Galaxy, etc.).
   */
  model?: string

  /**
   * Whether touch is supported.
   */
  hasTouch: boolean

  /**
   * User agent string.
   */
  userAgent: string
}

/**
 * Screen dimensions, pixel ratio, orientation, color depth, and dark mode preference.
 */
export interface ScreenInfo {
  /**
   * Screen width in pixels.
   */
  width: number

  /**
   * Screen height in pixels.
   */
  height: number

  /**
   * Available width (minus taskbar, etc.).
   */
  availableWidth: number

  /**
   * Available height.
   */
  availableHeight: number

  /**
   * Device pixel ratio (for retina displays).
   */
  pixelRatio: number

  /**
   * Color depth.
   */
  colorDepth: number

  /**
   * Screen orientation.
   */
  orientation: 'portrait' | 'landscape'

  /**
   * Whether the device is in dark mode.
   */
  isDarkMode: boolean
}

/**
 * Hardware capabilities (CPU cores, memory, touch points, WebGL support and renderer).
 */
export interface HardwareInfo {
  /**
   * Number of CPU cores.
   */
  cpuCores: number

  /**
   * Device memory in GB (approximate).
   */
  memory?: number

  /**
   * Maximum touch points.
   */
  maxTouchPoints: number

  /**
   * Whether the device has a GPU (canvas acceleration).
   */
  hasWebGL: boolean

  /**
   * WebGL renderer info.
   */
  webGLRenderer?: string
}

/**
 * Feature detection results.
 */
export interface FeatureSupport {
  /**
   * Service Worker support.
   */
  serviceWorker: boolean

  /**
   * Push notifications support.
   */
  pushNotifications: boolean

  /**
   * Web Share API support.
   */
  webShare: boolean

  /**
   * Geolocation support.
   */
  geolocation: boolean

  /**
   * Media devices (camera/mic) support.
   */
  mediaDevices: boolean

  /**
   * Web Bluetooth support.
   */
  bluetooth: boolean

  /**
   * Web NFC support.
   */
  nfc: boolean

  /**
   * Vibration API support.
   */
  vibration: boolean

  /**
   * Web USB support.
   */
  webUSB: boolean

  /**
   * Web Serial support.
   */
  webSerial: boolean

  /**
   * WebAuthn/Passkeys support.
   */
  webAuthn: boolean

  /**
   * IndexedDB support.
   */
  indexedDB: boolean

  /**
   * localStorage support.
   */
  localStorage: boolean

  /**
   * WebSocket support.
   */
  webSocket: boolean

  /**
   * Fullscreen API support.
   */
  fullscreen: boolean

  /**
   * Picture-in-Picture support.
   */
  pictureInPicture: boolean

  /**
   * Web Crypto API support.
   */
  crypto: boolean

  /**
   * Clipboard API support.
   */
  clipboard: boolean
}

/**
 * Device provider interface that all device bond packages must implement.
 * Provides access to device, screen, hardware, and feature information.
 */
export interface DeviceProvider {
  /** Returns parsed device information (browser, OS, device type). */
  getDeviceInfo(): DeviceInfo

  /** Returns current screen dimensions, pixel ratio, and orientation. */
  getScreenInfo(): ScreenInfo

  /** Returns hardware capabilities (CPU cores, memory, WebGL). */
  getHardwareInfo(): HardwareInfo

  /** Returns browser feature support flags. */
  getFeatureSupport(): FeatureSupport

  /** Checks whether a specific browser feature is supported. */
  supports(feature: keyof FeatureSupport): boolean

  /** Returns the raw user agent string. */
  getUserAgent(): string

  /** Returns the platform identifier (e.g. `'MacIntel'`). */
  getPlatform(): string

  /** Returns the browser's preferred language (e.g. `'en-US'`). */
  getLanguage(): string

  /** Returns all browser-preferred languages in priority order. */
  getLanguages(): string[]

  /** Returns whether the device has an active network connection. */
  isOnline(): boolean

  /** Returns whether the app is running in standalone/PWA mode. */
  isStandalone(): boolean
}
