# @molecule/app-network-react-native

React Native network status provider for molecule.dev.

Uses `@react-native-community/netinfo` to implement the NetworkProvider interface
from `@molecule/app-network`.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-network-react-native
```

## API

### Interfaces

#### `ReactNativeNetworkConfig`

Configuration for the React Native network provider.

```typescript
interface ReactNativeNetworkConfig {
  /**
   * URL to use for active connectivity checks.
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

#### `createReactNativeNetworkProvider(config)`

Creates a React Native network status provider backed by `@react-native-community/netinfo`.

```typescript
function createReactNativeNetworkProvider(config?: ReactNativeNetworkConfig): NetworkProvider
```

- `config` — Optional provider configuration.

**Returns:** A NetworkProvider implementation for React Native.

### Constants

#### `provider`

Default React Native network status provider.

```typescript
const provider: NetworkProvider
```

## Core Interface
Implements `@molecule/app-network` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-logger` ^1.0.0
- `@molecule/app-network` ^1.0.0
- `@react-native-community/netinfo` >=9.0.0
