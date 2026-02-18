# @molecule/app-device

Device information interface for molecule.dev.

Provides device, browser, and OS detection utilities
for analytics, feature detection, and platform-specific behavior.

## Type
`core`

## Installation
```bash
npm install @molecule/app-device
```

## API

### Interfaces

#### `BrowserInfo`

Parsed browser identity (name, version, rendering engine).

```typescript
interface BrowserInfo {
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
```

#### `DeviceInfo`

Parsed device identity (browser, OS, form factor, vendor, model, touch support).

```typescript
interface DeviceInfo {
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
```

#### `DeviceProvider`

Device provider interface that all device bond packages must implement.
Provides access to device, screen, hardware, and feature information.

```typescript
interface DeviceProvider {
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
```

#### `FeatureSupport`

Feature detection results.

```typescript
interface FeatureSupport {
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
```

#### `HardwareInfo`

Hardware capabilities (CPU cores, memory, touch points, WebGL support and renderer).

```typescript
interface HardwareInfo {
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
```

#### `OSInfo`

Operating system information.

```typescript
interface OSInfo {
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
```

#### `ScreenInfo`

Screen dimensions, pixel ratio, orientation, color depth, and dark mode preference.

```typescript
interface ScreenInfo {
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
```

### Functions

#### `createWebDeviceProvider()`

Creates a web-based device provider that reads device, screen, hardware,
and feature information from browser APIs. Results are cached except for
screen info, which is refreshed on every call since it can change.

```typescript
function createWebDeviceProvider(): DeviceProvider
```

**Returns:** A `DeviceProvider` backed by browser APIs.

#### `detectFeatureSupport()`

Detects browser feature support by checking for the presence of
APIs like Service Worker, Push, Geolocation, WebAuthn, etc.

```typescript
function detectFeatureSupport(): FeatureSupport
```

**Returns:** A `FeatureSupport` object with boolean flags for each feature.

#### `detectHardwareInfo()`

Detects hardware information including CPU cores, memory,
touch support, and WebGL capabilities.

```typescript
function detectHardwareInfo(): HardwareInfo
```

**Returns:** A `HardwareInfo` object with CPU, memory, and GPU details.

#### `detectScreenInfo()`

Detects screen information from browser APIs (window.screen,
devicePixelRatio, media queries). Returns sensible defaults
in non-browser environments.

```typescript
function detectScreenInfo(): ScreenInfo
```

**Returns:** A `ScreenInfo` object with dimensions, pixel ratio, and dark mode status.

#### `getDeviceInfo()`

Returns parsed user-agent data including browser, OS, and device type.

```typescript
function getDeviceInfo(): DeviceInfo
```

**Returns:** The current device information from the bonded provider.

#### `getFeatureSupport()`

Returns boolean flags for all detectable browser features (Service Worker, Push, Bluetooth, etc.).

```typescript
function getFeatureSupport(): FeatureSupport
```

**Returns:** The feature support map from the bonded provider.

#### `getHardwareInfo()`

Returns CPU cores, memory, touch points, and WebGL capabilities.

```typescript
function getHardwareInfo(): HardwareInfo
```

**Returns:** The current hardware information from the bonded provider.

#### `getLanguage()`

Returns the browser's preferred language (e.g. `'en-US'`).

```typescript
function getLanguage(): string
```

**Returns:** The `navigator.language` string.

#### `getPlatform()`

Returns the platform identifier (e.g. `'Win32'`, `'MacIntel'`, `'Linux x86_64'`).

```typescript
function getPlatform(): string
```

**Returns:** The `navigator.platform` string.

#### `getProvider()`

Retrieves the bonded device provider. If none is bonded, automatically
creates and bonds the built-in web device provider.

```typescript
function getProvider(): DeviceProvider
```

**Returns:** The active device provider.

#### `getScreenInfo()`

Returns screen dimensions, pixel ratio, color depth, orientation, and dark mode preference.

```typescript
function getScreenInfo(): ScreenInfo
```

**Returns:** The current screen information from the bonded provider.

#### `getUserAgent()`

Returns the raw user-agent string from the browser.

```typescript
function getUserAgent(): string
```

**Returns:** The `navigator.userAgent` string.

#### `hasProvider()`

Checks whether a device provider has been explicitly bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a device provider is bonded.

#### `isOnline()`

Checks whether the device currently has a network connection.

```typescript
function isOnline(): boolean
```

**Returns:** `true` if the browser reports being online.

#### `isStandalone()`

Checks whether the app is running in standalone mode (installed PWA).

```typescript
function isStandalone(): boolean
```

**Returns:** `true` if the app was launched from the home screen or app launcher.

#### `parseUserAgent(ua)`

Parses a user agent string to extract browser, OS, and device
type information.

```typescript
function parseUserAgent(ua: string): DeviceInfo
```

- `ua` — The user agent string to parse.

**Returns:** A `DeviceInfo` object with browser, OS, device type, and touch support.

#### `setProvider(provider)`

Registers a device provider as the active singleton.

```typescript
function setProvider(provider: DeviceProvider): void
```

- `provider` — The device provider implementation to bond.

#### `supports(feature)`

Checks whether a specific browser feature is supported.

```typescript
function supports(feature: keyof FeatureSupport): boolean
```

- `feature` — The feature key to check (e.g. `'serviceWorker'`, `'webAuthn'`, `'bluetooth'`).

**Returns:** `true` if the browser supports the specified feature.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
