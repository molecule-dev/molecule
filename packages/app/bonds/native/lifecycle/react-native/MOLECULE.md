# @molecule/app-lifecycle-react-native

React Native lifecycle provider for molecule.dev.

Uses react-native `AppState` + `Linking` to implement the
`LifecycleProvider` interface from `@molecule/app-lifecycle`: app-state
changes, deep-link URL opens, and memory warnings.

## Quick Start

```typescript
import { setProvider } from '@molecule/app-lifecycle'
import { provider } from '@molecule/app-lifecycle-react-native'

setProvider(provider)   // once, at app startup — before any lifecycle call
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-lifecycle-react-native @molecule/app-i18n @molecule/app-lifecycle @molecule/app-logger react-native
```

## API

### Interfaces

#### `ReactNativeLifecycleConfig`

Configuration for the React Native lifecycle provider.

```typescript
interface ReactNativeLifecycleConfig {
  /**
   * Whether to track deep link URL open events.
   * @default true
   */
  trackUrlOpen?: boolean

  /**
   * Whether to track memory warnings.
   * @default true
   */
  trackMemoryWarnings?: boolean

  /**
   * URL for active connectivity checks.
   * Should return a fast, lightweight response (e.g. HTTP 204).
   * @default 'https://clients3.google.com/generate_204'
   */
  connectivityCheckUrl?: string

  /**
   * Timeout in milliseconds for connectivity checks.
   * @default 5000
   */
  connectivityCheckTimeout?: number
}
```

### Functions

#### `createReactNativeLifecycleProvider(config)`

Creates a React Native lifecycle provider backed by react-native AppState.

```typescript
function createReactNativeLifecycleProvider(config?: ReactNativeLifecycleConfig): LifecycleProvider
```

- `config` — Optional provider configuration.

**Returns:** A LifecycleProvider implementation for React Native.

### Constants

#### `provider`

Default React Native lifecycle provider.

```typescript
const provider: LifecycleProvider
```

## Core Interface
Implements `@molecule/app-lifecycle` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-lifecycle'
import { provider } from '@molecule/app-lifecycle-react-native'

export function setupNativeLifecycleReactNative(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-lifecycle` ^1.0.0
- `@molecule/app-logger` ^1.0.0
- `react-native` >=0.72.0

### Runtime Dependencies

- `@molecule/app-i18n`
- `@molecule/app-lifecycle`
- `@molecule/app-logger`
- `react-native`

- **Wire `setProvider()` before any lifecycle call.** The core lazily bonds a
  browser-API WEB fallback on first use — subscribe early with no provider
  bonded and you're on the web provider, not this one.
- **Only app-state, URL-open, and memory-warning events fire.**
  `onNetworkChange`, `onBatteryChange`, and `onTerminate` accept listeners
  but are NEVER invoked by this bond, and `getBatteryState()` always
  resolves `null` — use `@molecule/app-network-react-native` for reactive
  connectivity and a dedicated battery integration (e.g. expo-battery)
  instead.
- `getNetworkState()` performs an active HTTP HEAD probe on every call — by
  default to `https://clients3.google.com/generate_204`. Point
  `connectivityCheckUrl` at your own endpoint if third-party egress is a
  concern; `connectionType` is always `'unknown'` here.
- `getLaunchInfo().coldStart` is always `true`; `destroy()` detaches the
  native subscriptions.
