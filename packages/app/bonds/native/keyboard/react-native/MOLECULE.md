# @molecule/app-keyboard-react-native

React Native keyboard provider for molecule.dev.

Uses react-native's `Keyboard`/`Dimensions` to implement the
`KeyboardProvider` interface from `@molecule/app-keyboard`: dismiss,
visibility + height state, and show/hide events.

## Quick Start

```typescript
import { setProvider } from '@molecule/app-keyboard'
import { provider } from '@molecule/app-keyboard-react-native'

setProvider(provider)   // once, at app startup
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-keyboard-react-native @molecule/app-i18n @molecule/app-keyboard @molecule/app-logger react-native
```

## API

### Interfaces

#### `ReactNativeKeyboardConfig`

Configuration for the React Native keyboard provider.

```typescript
interface ReactNativeKeyboardConfig {
  /**
   * Default scroll padding above keyboard when input is focused.
   * @default 20
   */
  defaultScrollPadding?: number
}
```

### Functions

#### `createReactNativeKeyboardProvider(config)`

Creates a React Native keyboard provider backed by react-native Keyboard.

```typescript
function createReactNativeKeyboardProvider(config?: ReactNativeKeyboardConfig): KeyboardProvider
```

- `config` — Optional provider configuration.

**Returns:** A KeyboardProvider implementation for React Native.

### Constants

#### `provider`

Default React Native keyboard provider.

```typescript
const provider: KeyboardProvider
```

## Core Interface
Implements `@molecule/app-keyboard` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-keyboard'
import { provider } from '@molecule/app-keyboard-react-native'

export function setupNativeKeyboardReactNative(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-keyboard` ^1.0.0
- `@molecule/app-logger` ^1.0.0
- `react-native` >=0.72.0

### Runtime Dependencies

- `@molecule/app-i18n`
- `@molecule/app-keyboard`
- `@molecule/app-logger`
- `react-native`

- **`show()` is a no-op and `toggle()` can only hide** — React Native cannot
  open the keyboard programmatically; focus a `TextInput` instead. `hide()`
  works (`Keyboard.dismiss()`).
- **`setResizeMode`/`setStyle`/`setAccessoryBar`/`setScroll` are no-ops** in
  this bond — resize is configured in AndroidManifest.xml / app.json, scroll
  via `KeyboardAvoidingView`. `getCapabilities()` reports all four `false`;
  feature-gate on it rather than assuming the calls did something.
- `ReactNativeKeyboardConfig.defaultScrollPadding` is currently INERT.
- Requires the `react-native` peer; it is imported lazily and a missing
  install surfaces as a descriptive error on first use.

## Translations

Translation strings are provided by `@molecule/app-locales-keyboard`.
