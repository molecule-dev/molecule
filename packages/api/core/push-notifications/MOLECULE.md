# @molecule/api-push-notifications

Push notification provider interface for molecule.dev.

Provides an abstract push notification interface that can be backed by any
push notification library. Use `setProvider` to bond a concrete implementation
such as `@molecule/api-push-notifications-web-push`.

## Quick Start

```ts
import { configure, sendMany, getPublicKey } from '@molecule/api-push-notifications'
configure({ email: 'ops@app.com', publicKey: VAPID_PUBLIC, privateKey: VAPID_PRIVATE })

// Browser subscribes with the PUBLIC key only; the API stores the subscription per user.
router.post('/push/subscribe', async (req, res) => {
  await saveSubscription(getUserId(res), req.body.subscription) // scoped to the user
  res.json({ ok: true })
})

// Server sends, then prunes subscriptions the push service reports as gone.
// A dead endpoint REJECTS (it lands in r.error with a statusCode), it does not
// resolve into r.result — checking r.result for 404/410 would never prune anything.
const rows = await subscriptionsFor(userId)
const results = await sendMany(rows.map((r) => r.subscription), { title: 'Hi', options: { body: '…' } })
results.forEach((r, i) => {
  const gone = (r.error as { statusCode?: number } | undefined)?.statusCode
  if (gone === 404 || gone === 410) deleteSubscription(rows[i].id)
})
```

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

Exactly one of `result` / `error` is set per entry. A dead subscription
(HTTP 404/410 from the push service) is a FAILURE: it arrives in `error`
(provider errors such as web-push's `WebPushError` carry a `statusCode`),
never as a resolved `result` — prune stored subscriptions by inspecting
`error`, not `result`.

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
| Capture | `@molecule/api-push-capture` |
| Web Push (VAPID) | `@molecule/api-push-notifications-web-push` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0

- The VAPID **private** key is a server secret — it stays in the API (config/secrets).
  Only the **public** key ({@link getPublicKey}) goes to the browser for `subscribe()`.
  Generate the pair ONCE with {@link generateVapidKeys} and persist it in env; do NOT
  regenerate per boot — new keys invalidate every existing subscription.
- Store each {@link PushSubscription} server-side, scoped to its user, and send from the
  server with {@link send}/{@link sendMany}. The browser never sends notifications and
  never holds another user's subscription.
- Prune dead endpoints: a gone subscription (HTTP 404/410 from the push service) surfaces
  as a **failed** send — with the web-push bond the per-subscription `error` in
  {@link SendManyResult} (a `WebPushError` carrying `statusCode`), NOT a resolved
  {@link SendResult}. Check `r.error` for 404/410 and delete that row so you stop pushing
  to it. (`send()` for a single subscription *throws* in that case.)
- `configure()` once at startup with your {@link VapidConfig} (email + keys).
