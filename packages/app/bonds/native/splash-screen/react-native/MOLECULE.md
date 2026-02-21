# @molecule/app-splash-screen-react-native

React Native splash screen provider for molecule.dev.

Uses expo-splash-screen to implement the SplashScreenProvider interface
from `@molecule/app-splash-screen`.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-splash-screen-react-native
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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-logger` ^1.0.0
- `@molecule/app-splash-screen` ^1.0.0
- `expo-splash-screen` >=0.20.0
