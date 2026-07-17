# @molecule/app-push-react-native

React Native push notifications provider for molecule.dev.

Implements the `PushProvider` interface from `@molecule/app-push` using
`expo-notifications`: permission flow, Expo push-token registration,
foreground/action listeners, local notifications, and badge management.

## Quick Start

```typescript
import { setProvider, requestPermission, register } from '@molecule/app-push'
import { provider } from '@molecule/app-push-react-native'

// Wire BEFORE anything touches the push bond (see remarks).
setProvider(provider)

// iOS requires permission before a token can be issued.
const status = await requestPermission()
if (status === 'granted') {
  const token = await register()
  // token.value is an EXPO push token ("ExponentPushToken[…]") — send it to
  // your API and deliver pushes via Expo's Push HTTP API.
}
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-push-react-native @molecule/app-i18n @molecule/app-logger @molecule/app-push expo-notifications
```

## API

### Interfaces

#### `ReactNativePushConfig`

Configuration for the React Native push notifications provider.

```typescript
interface ReactNativePushConfig {
  /**
   * Android notification channel ID. (Reserved — not currently applied by the provider.)
   */
  androidChannelId?: string

  /**
   * Android notification channel name. (Reserved — not currently applied by the provider.)
   */
  androidChannelName?: string

  /**
   * EAS `projectId` used when requesting an Expo push token. Required on Expo
   * SDK 49+ standalone/EAS builds — `getExpoPushTokenAsync` throws without it
   * outside Expo Go. When omitted, the provider falls back to the value in the
   * Expo config (`app.json` `extra.eas.projectId`, read via `expo-constants`).
   */
  projectId?: string

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

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-push'
import { provider } from '@molecule/app-push-react-native'

export function setupNativePushReactNative(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-logger` ^1.0.0
- `@molecule/app-push` ^1.0.0
- `expo-notifications` >=0.20.0

### Runtime Dependencies

- `@molecule/app-i18n`
- `@molecule/app-logger`
- `@molecule/app-push`
- `expo-notifications`

- **Call `setProvider(provider)` before ANY push call.** `@molecule/app-push`'s
  `getProvider()` silently auto-bonds a WEB push provider when nothing is bonded —
  in React Native that fails at runtime with service-worker errors instead of a
  clear "no provider" message.
- **Tokens are Expo push tokens, not raw FCM/APNs device tokens.** The server must
  send through Expo's Push API (`https://exp.host/--/api/v2/push/send`); an
  FCM/APNs sender cannot deliver to an `ExponentPushToken[…]`.
- **Standalone/EAS builds need an EAS `projectId`** for token registration
  (Expo SDK 49+ throws without one outside Expo Go). Pass it as the provider's
  `projectId` config option, or set `app.json` `extra.eas.projectId` — the
  provider reads that automatically via `expo-constants` when the option is
  omitted.
- `expo-notifications` is a peer dependency loaded on demand — install it with
  `npx expo install expo-notifications`.
- With `handleForeground: true` (default), the global foreground-display handler
  is installed when `onNotificationReceived()` is first subscribed — subscribe
  early (app root) if foreground alerts should always show.
- **The Expo push token and the native device token are distinct.**
  `register()`/`getToken()` return the Expo push token; `onTokenChange` fires
  with a freshly re-fetched Expo push token (NOT the raw native FCM/APNs token
  that triggered the change), so the token you send to your backend always
  stays an `ExponentPushToken[…]`.
- `unregister()` deregisters the device with the OS push service
  (`unregisterForNotificationsAsync()`) AND clears the locally cached token, so
  the backend can no longer deliver to it.

## Translations

Translation strings are provided by `@molecule/app-locales-push`.
