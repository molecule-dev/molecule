# @molecule/api-push-notifications

Push notification provider interface for molecule.dev.

Provides an abstract push notification interface that can be backed by any
push notification library. Use `setProvider` to bond a concrete implementation
such as `@molecule/api-push-notifications-web-push`.

## Type
`core`

## Installation
```bash
npm install @molecule/api-push-notifications
```

## API

### Interfaces

#### `NotificationPayload`

Notification payload structure.

```typescript
interface NotificationPayload {
  title: string
  options?: {
    body?: string
    icon?: string
    badge?: string
    image?: string
    tag?: string
    data?: Record<string, unknown>
    actions?: Array<{
      action: string
      title: string
      icon?: string
    }>
    requireInteraction?: boolean
    silent?: boolean
  }
}
```

#### `PushNotificationProvider`

Push notification provider interface that all implementations must satisfy.

```typescript
interface PushNotificationProvider {
  /**
   * Configure VAPID credentials for push notifications.
   */
  configure(config?: VapidConfig): void

  /**
   * Sends a push notification to a single subscription endpoint.
   */
  send(subscription: PushSubscription, payload: NotificationPayload): Promise<SendResult>

  /**
   * Sends a push notification to multiple subscriptions, handling
   * partial failures gracefully.
   */
  sendMany(
    subscriptions: PushSubscription[],
    payload: NotificationPayload,
  ): Promise<SendManyResult[]>

  /**
   * Generates a new VAPID key pair for push notification authentication.
   */
  generateVapidKeys(): VapidKeys

  /**
   * Returns the public VAPID key for client-side subscription requests,
   * or `undefined` if VAPID is not configured.
   */
  getPublicKey(): string | undefined
}
```

#### `PushSubscription`

A push subscription representing a client endpoint.

```typescript
interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}
```

#### `SendManyResult`

Result entry when sending to multiple subscriptions.

```typescript
interface SendManyResult {
  subscription: PushSubscription
  result?: SendResult
  error?: Error
}
```

#### `SendResult`

Result of sending a single push notification.

```typescript
interface SendResult {
  statusCode: number
  headers: Record<string, string>
  body: string
}
```

#### `VapidConfig`

VAPID configuration for push notification authentication.

```typescript
interface VapidConfig {
  email: string
  publicKey: string
  privateKey: string
}
```

#### `VapidKeys`

VAPID key pair returned by key generation.

```typescript
interface VapidKeys {
  publicKey: string
  privateKey: string
}
```

### Functions

#### `configure(config)`

Configures VAPID credentials on the bonded push notification provider.

```typescript
function configure(config?: VapidConfig): void
```

- `config` — The VAPID configuration containing email, public key, and private key.

#### `generateVapidKeys()`

Generates a new VAPID key pair for push notification authentication.

```typescript
function generateVapidKeys(): VapidKeys
```

**Returns:** An object containing `publicKey` and `privateKey` strings.

#### `getProvider()`

Retrieves the bonded push notification provider, or `undefined` if none is bonded.

```typescript
function getProvider(): PushNotificationProvider | undefined
```

**Returns:** The bonded push notification provider, or `undefined`.

#### `getPublicKey()`

Returns the public VAPID key for client-side push subscription requests.

```typescript
function getPublicKey(): string | undefined
```

**Returns:** The public VAPID key string, or `undefined` if not configured.

#### `hasProvider()`

Checks whether a push notification provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a push notification provider is bonded.

#### `requireProvider()`

Retrieves the bonded push notification provider, throwing if none is configured.

```typescript
function requireProvider(): PushNotificationProvider
```

**Returns:** The bonded push notification provider.

#### `send(subscription, payload)`

Sends a push notification to a single subscription endpoint.

```typescript
function send(subscription: PushSubscription, payload: NotificationPayload): Promise<SendResult>
```

- `subscription` — The push subscription containing the client endpoint and encryption keys.
- `payload` — The notification payload with title and optional display options.

**Returns:** The send result containing status code, headers, and response body.

#### `sendMany(subscriptions, payload)`

Sends a push notification to multiple subscription endpoints. Handles
partial failures gracefully — each result includes either the send
result or the error for that subscription.

```typescript
function sendMany(subscriptions: PushSubscription[], payload: NotificationPayload): Promise<SendManyResult[]>
```

- `subscriptions` — The push subscriptions to send to.
- `payload` — The notification payload with title and optional display options.

**Returns:** One result entry per subscription, each containing either `result` or `error`.

#### `setProvider(provider)`

Registers a push notification provider as the active singleton.
Called by bond packages during application startup.

```typescript
function setProvider(provider: PushNotificationProvider): void
```

- `provider` — The push notification provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| Web Push (VAPID) | `@molecule/api-push-notifications-web-push` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
