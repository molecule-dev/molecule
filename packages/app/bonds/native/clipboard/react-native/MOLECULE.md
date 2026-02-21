# @molecule/app-clipboard-react-native

React Native clipboard provider for molecule.dev.

Uses `@react-native-clipboard/clipboard` to implement the ClipboardProvider interface
from `@molecule/app-clipboard`.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-clipboard-react-native
```

## API

### Interfaces

#### `ReactNativeClipboardConfig`

Configuration for the React Native clipboard provider.

```typescript
interface ReactNativeClipboardConfig {
  /**
   * Whether to poll for clipboard changes (iOS only).
   * @default false
   */
  pollForChanges?: boolean

  /**
   * Polling interval in milliseconds (if pollForChanges is true).
   * @default 1000
   */
  pollInterval?: number
}
```

### Functions

#### `createReactNativeClipboardProvider(config)`

Creates a React Native clipboard provider backed by `@react-native-clipboard/clipboard`.

```typescript
function createReactNativeClipboardProvider(config?: ReactNativeClipboardConfig): ClipboardProvider
```

- `config` — Optional provider configuration.

**Returns:** A ClipboardProvider implementation for React Native.

### Constants

#### `provider`

Default React Native clipboard provider.

```typescript
const provider: ClipboardProvider
```

## Core Interface
Implements `@molecule/app-clipboard` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-clipboard` ^1.0.0
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-logger` ^1.0.0
- `@react-native-clipboard/clipboard` >=1.13.0
