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

#### `pushNotificationsWebPushSecretDefinitions`

Secret definitions required by the Web Push notifications bond.

```typescript
const pushNotificationsWebPushSecretDefinitions: SecretDefinition[]
```

## Core Interface
Implements `@molecule/api-push-notifications` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-push-notifications'
import { provider } from '@molecule/api-push-notifications-web-push'

export function setupPushNotificationsWebPush(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-push-notifications` ^1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `VAPID_PUBLIC_KEY` *(required)* — Web Push VAPID public key
  - **Auto-generated at scaffold — no manual setup.**
- `VAPID_PRIVATE_KEY` *(required)* — Web Push VAPID private key
  - **Auto-generated at scaffold — no manual setup.**
- `VAPID_EMAIL` *(required)* — Web Push contact email
  - Setup: Contact address sent to push services with each request (mailto: form).
  - Example: `mailto:you@example.com`
