# @molecule/app-keyboard-react-native

React Native keyboard provider for molecule.dev.

Uses react-native Keyboard to implement the KeyboardProvider interface
from `@molecule/app-keyboard`.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-keyboard-react-native
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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-keyboard` ^1.0.0
- `@molecule/app-logger` ^1.0.0
- `react-native` >=0.72.0
