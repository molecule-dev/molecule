# @molecule/app-lifecycle-react-native

React Native lifecycle provider for molecule.dev.

Uses react-native AppState to implement the LifecycleProvider interface
from `@molecule/app-lifecycle`.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-lifecycle-react-native
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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-lifecycle` ^1.0.0
- `@molecule/app-logger` ^1.0.0
- `react-native` >=0.72.0
