# @molecule/app-push-react-native

React Native push notifications provider for molecule.dev.

Uses expo-notifications to implement the PushProvider interface
from `@molecule/app-push`.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-push-react-native
```

## API

### Interfaces

#### `ReactNativePushConfig`

Configuration for the React Native push notifications provider.

```typescript
interface ReactNativePushConfig {
  /**
   * Android notification channel ID.
   */
  androidChannelId?: string

  /**
   * Android notification channel name.
   */
  androidChannelName?: string

  /**
   * Whether to handle notifications when the app is in the foreground.
   * @default true
   */
  handleForeground?: boolean
}
```

### Functions

#### `createReactNativePushProvider(config)`

Creates a React Native push notifications provider backed by expo-notifications.

```typescript
function createReactNativePushProvider(config?: ReactNativePushConfig): PushProvider
```

- `config` — Optional provider configuration.

**Returns:** A PushProvider implementation for React Native.

### Constants

#### `provider`

Default React Native push notifications provider.

```typescript
const provider: PushProvider
```

## Core Interface
Implements `@molecule/app-push` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-logger` ^1.0.0
- `@molecule/app-push` ^1.0.0
- `expo-notifications` >=0.20.0
