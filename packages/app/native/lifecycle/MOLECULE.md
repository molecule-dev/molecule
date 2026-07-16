# @molecule/app-lifecycle

App lifecycle interface for molecule.dev.

Provides a unified API for app-level runtime state across platforms
(web, native containers, etc.): foreground/background transitions
(`getAppState`, `onAppStateChange`), connectivity (`getNetworkState`,
`onNetworkChange`), battery (`getBatteryState`), and deep-link opens
(`onUrlOpen`).

## Quick Start

```typescript
import {
  getAppState,
  onAppStateChange,
  onNetworkChange,
} from '@molecule/app-lifecycle'

function pauseWhenHidden(pause: () => void, resume: () => void): () => void {
  if (getAppState() === 'active') resume()
  const offState = onAppStateChange((change) => {
    if (change.current === 'active') resume()
    else pause()
  })
  const offNet = onNetworkChange((net) => {
    if (!net.connected) pause()
  })
  return () => {
    offState()
    offNet()
  }
}
```

## Type
`native`

## Installation
```bash
npm install @molecule/app-lifecycle @molecule/app-bond
```

## API

### Interfaces

#### `AppStateChange`

App state change event.

```typescript
interface AppStateChange {
  /**
   * Current state.
   */
  current: AppState

  /**
   * Previous state.
   */
  previous: AppState

  /**
   * Timestamp of the change.
   */
  timestamp: number
}
```

#### `BatteryManager`

Browser Battery Manager API interface.

```typescript
interface BatteryManager extends EventTarget {
  charging: boolean
  chargingTime: number
  dischargingTime: number
  level: number
}
```

#### `BatteryState`

Device battery state (level 0–1 and charging status).

```typescript
interface BatteryState {
  /**
   * Battery level (0-1).
   */
  level: number

  /**
   * Whether the device is charging.
   */
  charging: boolean

  /**
   * Time until fully charged (seconds).
   */
  chargingTime?: number

  /**
   * Time until discharged (seconds).
   */
  dischargingTime?: number
}
```

#### `LaunchInfo`

App launch info.

```typescript
interface LaunchInfo {
  /**
   * Whether the app was cold started.
   */
  coldStart: boolean

  /**
   * URL that launched the app (deep link).
   */
  url?: string

  /**
   * Notification that launched the app.
   */
  notification?: unknown

  /**
   * Launch options/extras.
   */
  extras?: Record<string, unknown>
}
```

#### `LifecycleProvider`

Lifecycle provider interface.

All lifecycle providers must implement this interface.

```typescript
interface LifecycleProvider {
  /**
   * Get the current app state.
   * @returns The current app state: 'active', 'inactive', 'background', or 'unknown'.
   */
  getAppState(): AppState

  /**
   * Get the current network connectivity state.
   * @returns The network state including connection status and type.
   */
  getNetworkState(): Promise<NetworkState>

  /**
   * Get the current battery state, if available.
   * @returns The battery state (level, charging), or null if not available.
   */
  getBatteryState(): Promise<BatteryState | null>

  /**
   * Get the app launch info (cold start, deep link URL, notification).
   * @returns The launch info, or null if not available.
   */
  getLaunchInfo(): Promise<LaunchInfo | null>

  /**
   * Subscribe to app state changes (active, inactive, background).
   * @param listener - Called when the app state changes.
   * @returns A function that unsubscribes the listener when called.
   */
  onAppStateChange(listener: AppStateListener): () => void

  /**
   * Subscribe to network connectivity changes.
   * @param listener - Called when the network state changes.
   * @returns A function that unsubscribes the listener when called.
   */
  onNetworkChange(listener: NetworkStateListener): () => void

  /**
   * Subscribe to battery state changes.
   * @param listener - Called when the battery state changes.
   */
  onBatteryChange(listener: BatteryStateListener): () => void

  /**
   * Subscribe to app termination events.
   * @param listener - Called when the app is about to be terminated.
   * @returns A function that unsubscribes the listener when called.
   */
  onTerminate(listener: () => void): () => void

  /**
   * Subscribe to deep link URL open events.
   * @param listener - Called with the URL string when the app is opened via a deep link.
   * @returns A function that unsubscribes the listener when called.
   */
  onUrlOpen(listener: (url: string) => void): () => void

  /**
   * Subscribe to low memory warnings.
   * @param listener - Called when the system reports low memory.
   * @returns A function that unsubscribes the listener when called.
   */
  onMemoryWarning(listener: () => void): () => void

  /**
   * Destroy the provider and clean up all event listeners.
   */
  destroy(): void
}
```

#### `NavigatorWithBattery`

Navigator extension with Battery API support.

```typescript
interface NavigatorWithBattery extends Navigator {
  getBattery?: () => Promise<BatteryManager>
}
```

#### `NavigatorWithConnection`

Navigator extension with Network Information API support.

```typescript
interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation
}
```

#### `NetworkInformation`

Browser Network Information API interface.

```typescript
interface NetworkInformation {
  type?: string
  effectiveType?: string
}
```

#### `NetworkState`

Device network connectivity state (connected, connection type, metered).

```typescript
interface NetworkState {
  /**
   * Whether the device is connected.
   */
  connected: boolean

  /**
   * Connection type.
   */
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'none' | 'unknown'

  /**
   * Whether the connection is expensive (cellular).
   */
  isExpensive?: boolean
}
```

### Types

#### `AppState`

App state values.

```typescript
type AppState = 'active' | 'inactive' | 'background' | 'unknown'
```

#### `AppStateListener`

Callback invoked when the app state changes.

```typescript
type AppStateListener = (change: AppStateChange) => void
```

#### `BatteryStateListener`

Callback invoked when the battery state changes.

```typescript
type BatteryStateListener = (state: BatteryState) => void
```

#### `NetworkStateListener`

Callback invoked when the network state changes.

```typescript
type NetworkStateListener = (state: NetworkState) => void
```

### Functions

#### `createWebLifecycleProvider()`

Create a web-based lifecycle provider using browser APIs (Page Visibility,
Navigator.onLine, Battery API). Used as the default fallback when no
native provider is registered.

```typescript
function createWebLifecycleProvider(): LifecycleProvider
```

**Returns:** A LifecycleProvider implementation backed by browser APIs.

#### `getAppState()`

Get the current app state.

```typescript
function getAppState(): AppState
```

**Returns:** The current state: 'active', 'inactive', 'background', or 'unknown'.

#### `getBatteryState()`

Get the current battery state, if available.

```typescript
function getBatteryState(): Promise<BatteryState | null>
```

**Returns:** The battery state (level, charging), or null if not available.

#### `getNetworkState()`

Get the current network connectivity state.

```typescript
function getNetworkState(): Promise<NetworkState>
```

**Returns:** The network state including connection status and type.

#### `getProvider()`

Get the current lifecycle provider. Falls back to a web-based provider using browser APIs if none is set.

```typescript
function getProvider(): LifecycleProvider
```

**Returns:** The active LifecycleProvider instance.

#### `hasProvider()`

Check if a lifecycle provider has been registered.

```typescript
function hasProvider(): boolean
```

**Returns:** Whether a LifecycleProvider has been bonded.

#### `onAppStateChange(listener)`

Subscribe to app state changes (active, inactive, background).

```typescript
function onAppStateChange(listener: AppStateListener): () => void
```

- `listener` — Called with an AppStateChange when the state transitions.

**Returns:** A function that unsubscribes the listener when called.

#### `onNetworkChange(listener)`

Subscribe to network connectivity changes.

```typescript
function onNetworkChange(listener: NetworkStateListener): () => void
```

- `listener` — Called with the new NetworkState when connectivity changes.

**Returns:** A function that unsubscribes the listener when called.

#### `onUrlOpen(listener)`

Subscribe to deep link URL open events.

```typescript
function onUrlOpen(listener: (url: string) => void): () => void
```

- `listener` — Called with the URL string when the app is opened via a deep link.

**Returns:** A function that unsubscribes the listener when called.

#### `setProvider(provider)`

Set the lifecycle provider implementation.

```typescript
function setProvider(provider: LifecycleProvider): void
```

- `provider` — LifecycleProvider implementation to register.

### Constants

#### `webProvider`

Pre-created web lifecycle provider instance, or null if running outside a browser.

```typescript
const webProvider: LifecycleProvider | null
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0

### Runtime Dependencies

- `@molecule/app-bond`

- **No wiring is needed on web**: the first accessor call silently bonds
  the built-in browser provider (visibilitychange/online/Battery API).
  In a native container wire `@molecule/app-lifecycle-react-native` (the
  one prebuilt bond) via `setProvider()` BEFORE the first lifecycle call —
  listeners registered earlier stay attached to the auto-bonded web
  fallback.
- `getBatteryState()` resolves `null` where unavailable (most desktop
  browsers; the Battery Status API is Chromium-only) — always handle null.
- The web fallback's network info is best-effort (`navigator.onLine` +
  Network Information API where present); `onUrlOpen` on web only fires
  for in-page navigation patterns, real deep-link events need the native
  bond.
- Every `on*` subscription returns an unsubscribe function — call it on
  unmount.
