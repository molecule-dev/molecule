# @molecule/app-splash-screen-react-native

React Native splash screen provider for molecule.dev.

Implements the `SplashScreenProvider` interface from `@molecule/app-splash-screen`
using `expo-splash-screen`: keeps the native splash visible during startup and
hides it when the app is ready.

## Quick Start

```typescript
import { setProvider, hide } from '@molecule/app-splash-screen'
import { provider } from '@molecule/app-splash-screen-react-native'

setProvider(provider)

// Later — once the root view has rendered / initial data + fonts are ready:
await hide()
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-splash-screen-react-native @molecule/app-i18n @molecule/app-logger @molecule/app-splash-screen expo-splash-screen
```

## API

### Interfaces

#### `ReactNativeSplashScreenConfig`

Configuration for the React Native splash screen provider.

```typescript
interface ReactNativeSplashScreenConfig {
  /**
   * Whether to prevent auto-hide on app launch.
   * When true, the splash screen stays visible until explicitly hidden.
   * @default true
   */
  preventAutoHide?: boolean
}
```

### Functions

#### `createReactNativeSplashScreenProvider(config)`

Creates a React Native splash screen provider backed by expo-splash-screen.

```typescript
function createReactNativeSplashScreenProvider(config?: ReactNativeSplashScreenConfig): SplashScreenProvider
```

- `config` — Optional provider configuration.

**Returns:** A SplashScreenProvider implementation for React Native.

### Constants

#### `provider`

Default React Native splash screen provider.

```typescript
const provider: SplashScreenProvider
```

## Core Interface
Implements `@molecule/app-splash-screen` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-splash-screen'
import { provider } from '@molecule/app-splash-screen-react-native'

export function setupNativeSplashScreenReactNative(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-logger` ^1.0.0
- `@molecule/app-splash-screen` ^1.0.0
- `expo-splash-screen` >=0.20.0

### Runtime Dependencies

- `@molecule/app-i18n`
- `@molecule/app-logger`
- `@molecule/app-splash-screen`
- `expo-splash-screen`

- **Creating the default `provider` immediately arms prevent-auto-hide** (config
  `preventAutoHide` defaults to `true`): the native splash stays up until the app
  explicitly calls `hide()`. If the app appears to hang on the splash forever, the
  missing `hide()` call is why. Use `createReactNativeSplashScreenProvider({
  preventAutoHide: false })` to keep the OS auto-hide behavior.
- `expo-splash-screen` is loaded on demand — install with
  `npx expo install expo-splash-screen`.
- `show()`/`hide()` OPTIONS (fade, duration, spinner) are ignored on this platform —
  `getCapabilities()` reports `spinnerSupported: false, configurable: false`. Style
  the splash via the Expo config plugin (`app.json` → `expo-splash-screen`), not at
  runtime.
- `show()` cannot bring back an already-hidden splash; it only re-arms
  prevent-auto-hide for the current launch.

## Translations

Translation strings are provided by `@molecule/app-locales-splash-screen`.
