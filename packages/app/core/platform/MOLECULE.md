# @molecule/app-platform

Platform detection and abstraction for molecule.dev.

Provides utilities for detecting the current platform and abstracting
platform-specific functionality.

## Type
`core`

## Installation
```bash
npm install @molecule/app-platform
```

## API

### Interfaces

#### `CapacitorApp`

Capacitor app coordinator return type.

```typescript
interface CapacitorApp {
  /**
   * Initialize the app. Call this during startup.
   */
  initialize(): Promise<void>

  /**
   * Whether the app is fully ready.
   */
  isReady(): boolean

  /**
   * Get the current initialization state.
   */
  getState(): CapacitorAppState

  /**
   * Subscribe to state changes.
   */
  subscribe(callback: (state: CapacitorAppState) => void): () => void

  /**
   * Register a callback for when the app becomes ready.
   * If already ready, the callback fires immediately.
   */
  onReady(callback: () => void): () => void

  /**
   * Clean up listeners.
   */
  destroy(): void
}
```

#### `CapacitorAppOptions`

Capacitor app configuration options.

```typescript
interface CapacitorAppOptions {
  /**
   * Callback invoked when the app is fully initialized and ready to render.
   */
  onReady?: () => void | Promise<void>

  /**
   * Whether to initialize push notifications on startup.
   * @default false
   */
  pushNotifications?: boolean

  /**
   * Whether to handle deep links on startup.
   * @default false
   */
  deepLinks?: boolean

  /**
   * Deep link handler callback.
   */
  onDeepLink?: (url: string) => void
}
```

#### `CapacitorAppState`

Capacitor app coordinator state.

```typescript
interface CapacitorAppState {
  /**
   * Whether the app is fully initialized.
   */
  ready: boolean

  /**
   * Whether device ready has fired.
   */
  deviceReady: boolean

  /**
   * Whether push notifications are initialized.
   */
  pushReady: boolean

  /**
   * Initialization error, if any.
   */
  error: Error | null
}
```

#### `PlatformInfo`

Detected runtime environment details (platform, native/mobile/desktop/web flags, dev/prod mode).

```typescript
interface PlatformInfo {
  /**
   * The current platform.
   */
  platform: Platform

  /**
   * Whether running in a native app (Capacitor, React Native, Electron).
   */
  isNative: boolean

  /**
   * Whether running in a mobile app (iOS or Android).
   */
  isMobile: boolean

  /**
   * Whether running in a desktop app (Electron, macOS, Windows, Linux).
   */
  isDesktop: boolean

  /**
   * Whether running in a web browser.
   */
  isWeb: boolean

  /**
   * Whether running in development mode.
   */
  isDevelopment: boolean

  /**
   * Whether running in production mode.
   */
  isProduction: boolean

  /**
   * The user agent string (if available).
   */
  userAgent?: string

  /**
   * The app version (if available).
   */
  appVersion?: string
}
```

### Types

#### `Platform`

Target runtime platforms: web, ios, android, electron, macos, windows, linux.

```typescript
type Platform = 'web' | 'ios' | 'android' | 'electron' | 'macos' | 'windows' | 'linux'
```

### Functions

#### `createCapacitorApp(options)`

Creates a Capacitor app coordinator.

Orchestrates native app initialization in the correct order:
1. Wait for device ready
2. Initialize push notifications (if configured)
3. Handle deep links (if configured)
4. Signal readiness

```typescript
function createCapacitorApp(options?: CapacitorAppOptions): CapacitorApp
```

- `options` — Configuration options.

**Returns:** A CapacitorApp instance with lifecycle, push notification, and deep link management.

#### `detectPlatform()`

Detects the current runtime platform by checking for Capacitor,
Electron, React Native, and falling back to `'web'`.

```typescript
function detectPlatform(): Platform
```

**Returns:** The detected platform identifier.

#### `getPlatformInfo(env, env, env)`

Builds comprehensive platform information including platform type,
environment flags, and user agent details.

```typescript
function getPlatformInfo(env?: { isDevelopment?: boolean; isProduction?: boolean; }): PlatformInfo
```

- `env` — Optional environment overrides for development/production flags.
- `env` — .isDevelopment - Override for development mode detection.
- `env` — .isProduction - Override for production mode detection.

**Returns:** A `PlatformInfo` object with all platform details.

#### `isPlatform(platforms)`

Checks if the current platform matches any of the specified platforms.

```typescript
function isPlatform(platforms?: Platform[]): boolean
```

- `platforms` — One or more platform identifiers to check against.

**Returns:** `true` if the current platform matches any of the given platforms.

#### `onPlatform(handlers)`

Executes a platform-specific handler based on the detected platform.
Falls back to the `default` handler if no handler matches.

```typescript
function onPlatform(handlers: Partial<Record<Platform, () => T>> & { default: () => T; }): T
```

- `handlers` — A map of platform identifiers to handler functions, with a required `default`.

**Returns:** The return value of the matched (or default) handler.

#### `platform()`

Returns the current platform info, caching the result after first call.

```typescript
function platform(): PlatformInfo
```

**Returns:** The cached `PlatformInfo` object.

#### `resetPlatformCache()`

Resets the cached platform info. Useful for testing or when the
platform context changes.

```typescript
function resetPlatformCache(): void
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-lifecycle` ^1.0.0
- `@molecule/app-logger` ^1.0.0
- `@molecule/app-push` ^1.0.0
