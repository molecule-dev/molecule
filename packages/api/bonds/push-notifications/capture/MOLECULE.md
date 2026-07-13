# @molecule/api-push-capture

Push notification capture provider for molecule.dev.

Records every `send()` / `sendMany()` call as an activity event.
Intercept-only by default; delegates + tees when wrapping a real provider.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-push-notifications'
import { provider } from '@molecule/api-push-capture'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-push-capture
```

## API

### Functions

#### `createPushCaptureProvider(realProvider)`

Creates a push notification capture provider.

When `realProvider` is provided, each notification is delivered through it
and the captured event records the real outcome (delegate + tee). When
omitted (the dev default), notifications are intercepted and a synthetic
`SendResult` (`statusCode: 201`) is returned.

```typescript
function createPushCaptureProvider(realProvider?: PushNotificationProvider): PushNotificationProvider
```

- `realProvider` — Optional real provider to delegate to and tee.

**Returns:** A {@link PushNotificationProvider} that records activity for every send.

### Constants

#### `provider`

Default push notification capture provider (intercept-only).

```typescript
const provider: PushNotificationProvider
```

## Core Interface
Implements `@molecule/api-push-notifications` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-push-notifications'
import { provider } from '@molecule/api-push-capture'

export function setupPushNotificationsCapture(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-activity` ^1.0.0
- `@molecule/api-push-notifications` ^1.0.0

In intercept-only mode (no `realProvider`), `generateVapidKeys()` THROWS —
there is no real push transport behind it to generate real keys with.
Wrap a real provider (`createPushCaptureProvider(realProvider)`) to
delegate key generation, or generate VAPID keys once with a real provider
(e.g. `@molecule/api-push-notifications-web-push`'s `generateVapidKeys()`)
and set `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`. `getPublicKey()` is
unaffected — it honestly falls back to the `VAPID_PUBLIC_KEY` env var so
the enable-push UI keeps working in capture mode even though sends stay
captured.
