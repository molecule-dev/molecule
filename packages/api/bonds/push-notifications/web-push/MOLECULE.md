# @molecule/api-push-notifications-web-push

Web Push provider for molecule.dev push notifications.

Provides push notification delivery using the Web Push protocol.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-push-notifications-web-push @molecule/api-bond @molecule/api-push-notifications @molecule/api-secrets web-push
npm install -D @types/web-push
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

The `set` trap is REQUIRED, not defensive: methods reached through the proxy
run with `this` bound to the proxy, so an instance-state write like
`this.configured = true` would otherwise land on the dummy `{}` target while
every read passes through to the real instance — `configure()` could then
never take effect and every send would throw "not configured".

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

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-push-notifications`
- `@molecule/api-secrets`
- `web-push`

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] The UI offers an enable-notifications control; activating it triggers
  the browser permission prompt and, once granted, the subscription is
  stored (the UI still shows "enabled" after a full reload).
- [ ] An event this app notifies about actually delivers a push to the
  subscribed session, with a readable title/body (not raw JSON). The sandbox
  CAPTURES outbound pushes instead of delivering — read the captured message
  with the `read_activity` tool (filter type 'push'); never mock the flow or
  modify production code to expose it.
- [ ] Clicking the delivered notification opens/focuses the relevant screen
  (when the app claims deep-linking).
- [ ] Denying the permission leaves the app fully usable and truthful about
  the state (no crash, no false "enabled").
- [ ] Disabling/unsubscribing stops deliveries, and the disabled state
  persists across a reload.
