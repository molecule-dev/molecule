# @molecule/app-push

Client-side push notifications interface for molecule.dev.

Provides a unified API for push notifications that works across
different platforms (web, Capacitor, React Native, etc.).

## Type
`native`

## Installation
```bash
npm install @molecule/app-push
```

## API

### Interfaces

#### `LocalNotificationOptions`

Options for scheduling a local notification.

```typescript
interface LocalNotificationOptions {
  /**
   * Notification ID.
   */
  id?: string

  /**
   * Notification title.
   */
  title: string

  /**
   * Notification body.
   */
  body?: string

  /**
   * Schedule at a specific time.
   */
  at?: Date

  /**
   * Repeat interval.
   */
  repeat?: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'

  /**
   * Extra data.
   */
  extra?: Record<string, unknown>

  /**
   * Sound to play.
   */
  sound?: string

  /**
   * Badge count.
   */
  badge?: number

  /**
   * Notification channel (Android).
   */
  channelId?: string

  /**
   * Actions/buttons.
   */
  actions?: PushNotificationAction[]
}
```

#### `NotificationActionEvent`

Notification action event.

```typescript
interface NotificationActionEvent {
  /**
   * The notification.
   */
  notification: PushNotification

  /**
   * Action that was triggered.
   */
  actionId?: string
}
```

#### `NotificationReceivedEvent`

Notification received event.

```typescript
interface NotificationReceivedEvent {
  /**
   * The notification.
   */
  notification: PushNotification

  /**
   * Whether the app was in foreground.
   */
  foreground: boolean
}
```

#### `PushNotification`

Push notification payload.

```typescript
interface PushNotification {
  /**
   * Notification ID.
   */
  id: string

  /**
   * Notification title.
   */
  title: string

  /**
   * Notification body/message.
   */
  body?: string

  /**
   * Notification data payload.
   */
  data?: Record<string, unknown>

  /**
   * Badge count.
   */
  badge?: number

  /**
   * Sound to play.
   */
  sound?: string

  /**
   * Icon URL.
   */
  icon?: string

  /**
   * Image URL.
   */
  image?: string

  /**
   * Click action/URL.
   */
  clickAction?: string

  /**
   * Notification tag (for grouping).
   */
  tag?: string

  /**
   * Whether the notification requires interaction.
   */
  requireInteraction?: boolean

  /**
   * Notification timestamp.
   */
  timestamp?: number

  /**
   * Notification actions (buttons).
   */
  actions?: PushNotificationAction[]
}
```

#### `PushNotificationAction`

Notification action button.

```typescript
interface PushNotificationAction {
  /**
   * Action ID.
   */
  id: string

  /**
   * Action title.
   */
  title: string

  /**
   * Action icon.
   */
  icon?: string
}
```

#### `PushProvider`

Push notifications provider interface.

All push providers must implement this interface.

```typescript
interface PushProvider {
  /**
   * Checks the current permission status.
   */
  checkPermission(): Promise<PermissionStatus>

  /**
   * Requests notification permission.
   */
  requestPermission(): Promise<PermissionStatus>

  /**
   * Registers for push notifications and gets a token.
   */
  register(): Promise<PushToken>

  /**
   * Unregisters from push notifications.
   */
  unregister(): Promise<void>

  /**
   * Gets the current push token.
   * @returns The current token, or `null` if not registered.
   */
  getToken(): Promise<PushToken | null>

  /**
   * Subscribes to notification received events.
   */
  onNotificationReceived(listener: NotificationReceivedListener): () => void

  /**
   * Subscribes to notification action events (taps, button clicks).
   */
  onNotificationAction(listener: NotificationActionListener): () => void

  /**
   * Subscribes to token changes.
   */
  onTokenChange(listener: TokenChangeListener): () => void

  /**
   * Schedules a local notification.
   */
  scheduleLocal(options: LocalNotificationOptions): Promise<string>

  /**
   * Cancels a local notification.
   */
  cancelLocal(id: string): Promise<void>

  /**
   * Cancels all local notifications.
   */
  cancelAllLocal(): Promise<void>

  /**
   * Gets pending local notifications.
   */
  getPendingLocal(): Promise<LocalNotificationOptions[]>

  /**
   * Gets delivered notifications.
   */
  getDelivered(): Promise<PushNotification[]>

  /**
   * Removes delivered notifications.
   */
  removeDelivered(ids: string[]): Promise<void>

  /**
   * Removes all delivered notifications.
   */
  removeAllDelivered(): Promise<void>

  /**
   * Sets the badge count.
   */
  setBadge(count: number): Promise<void>

  /**
   * Gets the badge count.
   */
  getBadge(): Promise<number>

  /**
   * Clears the badge.
   */
  clearBadge(): Promise<void>

  /**
   * Destroys the provider.
   */
  destroy(): void
}
```

#### `PushToken`

Push token info.

```typescript
interface PushToken {
  /**
   * Token value.
   */
  value: string

  /**
   * Platform the token is for.
   */
  platform: 'web' | 'ios' | 'android'

  /**
   * When the token was obtained.
   */
  timestamp: number
}
```

### Types

#### `NotificationActionListener`

Notification Action Listener type.

```typescript
type NotificationActionListener = (event: NotificationActionEvent) => void
```

#### `NotificationReceivedListener`

Listener invoked when a push notification is received.

```typescript
type NotificationReceivedListener = (event: NotificationReceivedEvent) => void
```

#### `PermissionStatus`

Push notification permission status.

```typescript
type PermissionStatus = 'granted' | 'denied' | 'default' | 'prompt'
```

#### `TokenChangeListener`

Token Change Listener type.

```typescript
type TokenChangeListener = (token: PushToken) => void
```

### Functions

#### `checkPermission()`

Checks the current notification permission status.

```typescript
function checkPermission(): Promise<PermissionStatus>
```

**Returns:** The current permission status (granted, denied, default, or prompt).

#### `clearBadge()`

Clears the app icon badge count.

```typescript
function clearBadge(): Promise<void>
```

**Returns:** A promise that resolves when the badge count is cleared.

#### `createWebPushProvider(vapidPublicKey)`

Creates a web push provider using the browser Push API and Notification API.

```typescript
function createWebPushProvider(vapidPublicKey?: string): PushProvider
```

- `vapidPublicKey` — Optional VAPID public key for server-authenticated subscriptions.

**Returns:** A {@link PushProvider} backed by the Web Push API.

#### `getProvider()`

Gets the current push provider, creating a default web provider if none is bonded.

```typescript
function getProvider(): PushProvider
```

**Returns:** The active push provider instance.

#### `getToken()`

Gets the current push token.

```typescript
function getToken(): Promise<PushToken | null>
```

**Returns:** The current token, or `null` if not registered.

#### `hasProvider()`

Checks if a push provider has been bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** Whether a push provider is currently registered.

#### `onNotificationAction(listener)`

Subscribes to notification action events (taps, button clicks).

```typescript
function onNotificationAction(listener: NotificationActionListener): () => void
```

- `listener` — Callback invoked when a notification action is triggered.

**Returns:** An unsubscribe function to remove the listener.

#### `onNotificationReceived(listener)`

Subscribes to notification received events.

```typescript
function onNotificationReceived(listener: NotificationReceivedListener): () => void
```

- `listener` — Callback invoked when a notification is received.

**Returns:** An unsubscribe function to remove the listener.

#### `register()`

Registers for push notifications and obtains a device token.

```typescript
function register(): Promise<PushToken>
```

**Returns:** The push token for this device.

#### `requestPermission()`

Requests notification permission from the user.

```typescript
function requestPermission(): Promise<PermissionStatus>
```

**Returns:** The resulting permission status after the user responds.

#### `scheduleLocal(options)`

Schedules a local notification.

```typescript
function scheduleLocal(options: LocalNotificationOptions): Promise<string>
```

- `options` — Configuration for the notification (title, body, schedule time, etc.).

**Returns:** The notification ID that can be used to cancel it later.

#### `setBadge(count)`

Sets the app icon badge count.

```typescript
function setBadge(count: number): Promise<void>
```

- `count` — The badge number to display on the app icon.

**Returns:** A promise that resolves when the badge count is set.

#### `setProvider(provider)`

Sets the push provider implementation.

```typescript
function setProvider(provider: PushProvider): void
```

- `provider` — The push provider to bond as the active implementation.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
- `@molecule/app-i18n` ^1.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-push`.
