# @molecule/app-status-bar-react-native

React Native status bar provider for molecule.dev.

Implements the `StatusBarProvider` interface from `@molecule/app-status-bar`
using React Native's `StatusBar` API: bar style, visibility, background color,
and translucency.

## Quick Start

```typescript
import { setProvider, setStyle } from '@molecule/app-status-bar'
import { provider } from '@molecule/app-status-bar-react-native'

setProvider(provider)
await setStyle('light') // light text over a dark header
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-status-bar-react-native @molecule/app-i18n @molecule/app-status-bar react-native
```

## API

### Interfaces

#### `ReactNativeStatusBarConfig`

Configuration for the React Native status bar provider.

```typescript
interface ReactNativeStatusBarConfig {
  /**
   * Initial background color.
   */
  initialBackgroundColor?: string

  /**
   * Initial bar style.
   * @default 'default'
   */
  initialStyle?: 'dark' | 'light' | 'default'

  /**
   * Whether to use animations for changes.
   * @default true
   */
  animated?: boolean
}
```

### Functions

#### `createReactNativeStatusBarProvider(config)`

Creates a React Native status bar provider backed by react-native StatusBar.

```typescript
function createReactNativeStatusBarProvider(config?: ReactNativeStatusBarConfig): StatusBarProvider
```

- `config` — Optional provider configuration.

**Returns:** A StatusBarProvider implementation for React Native.

### Constants

#### `provider`

Default React Native status bar provider.

```typescript
const provider: StatusBarProvider
```

## Core Interface
Implements `@molecule/app-status-bar` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-status-bar'
import { provider } from '@molecule/app-status-bar-react-native'

export function setupNativeStatusBarReactNative(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-status-bar` ^1.0.0
- `react-native` >=0.72.0

### Runtime Dependencies

- `@molecule/app-i18n`
- `@molecule/app-status-bar`
- `react-native`

- **Android-only surfaces:** `setBackgroundColor()` and `setOverlaysWebView()`
  (translucency) are Android APIs — silent no-ops on iOS. Style (`light`/`dark`)
  and visibility work on both platforms.
- **`getCapabilities()` reports per-platform truthfully:** `canSetBackgroundColor`
  and `canSetOverlay` are `false` on iOS (the Android-only no-op APIs above) and
  `true` on Android, so callers can feature-detect instead of trusting a blanket
  `true`.
- **`getHeight()` returns 0 on iOS** (`StatusBar.currentHeight` is Android-only) —
  use safe-area insets for layout, not this value.
- `getState()` reflects what THIS provider last set (locally tracked), not values
  changed elsewhere (e.g. by a navigation library's own status-bar handling).
- `initialStyle`/`initialBackgroundColor` config only seed the tracked snapshot —
  they do not apply anything at startup; call `configure({ … })` once at launch to
  actually set the bar.

## Translations

Translation strings are provided by `@molecule/app-locales-status-bar`.
