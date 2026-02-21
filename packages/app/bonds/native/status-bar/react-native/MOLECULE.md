# @molecule/app-status-bar-react-native

React Native status bar provider for molecule.dev.

Uses react-native StatusBar to implement the StatusBarProvider interface
from `@molecule/app-status-bar`.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-status-bar-react-native
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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-status-bar` ^1.0.0
- `react-native` >=0.72.0
