# @molecule/api-push-notifications-web-push

Web Push provider for molecule.dev push notifications.

Provides push notification delivery using the Web Push protocol.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-push-notifications-web-push
```

## API

### Functions

#### `createProvider()`

Creates a new `WebPushProvider` instance. VAPID credentials are configured lazily on first send.

```typescript
function createProvider(): PushNotificationProvider
```

**Returns:** A `PushNotificationProvider` backed by the `web-push` library.

### Constants

#### `provider`

Lazily-initialized push notification provider using the `web-push` library.
Created on first property access via a `Proxy` so no work is done at import time.

```typescript
const provider: PushNotificationProvider
```

## Core Interface
Implements `@molecule/api-push-notifications` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-push-notifications` ^1.0.0

### Environment Variables

- `VAPID_PUBLIC_KEY` *(required)*
- `VAPID_PRIVATE_KEY` *(required)*
- `VAPID_EMAIL` *(required)*
