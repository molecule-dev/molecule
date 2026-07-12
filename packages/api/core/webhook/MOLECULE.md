# @molecule/api-webhook

Webhook core interface for molecule.dev.

Defines the standard interface for webhook dispatch providers
(HTTP, queue-backed, etc.).

## Quick Start

```typescript
import { setProvider, register, dispatch } from '@molecule/api-webhook'
setProvider(httpWebhookProvider) // bond at startup

// SSRF guard: reject private/link-local/metadata destinations BEFORE registering.
if (!isAllowedWebhookUrl(url)) throw new Error('Destination not allowed')
const hook = await register(url, ['order.created']) // provider signs deliveries with hook.secret
await saveWebhookRow({ id: hook.id, userId: getUserId(res) }) // own it → scope list/delete by user
// Share hook.secret with the receiver so they can verify the signature header.

const results = await dispatch('order.created', { orderId: '123' })
console.log(results[0].success) // true
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-webhook
```

## API

### Interfaces

#### `PaginationOptions`

Pagination options for listing webhook deliveries.

```typescript
interface PaginationOptions {
  /** Maximum number of results to return. */
  limit?: number

  /** Number of results to skip. */
  offset?: number
}
```

#### `WebhookDelivery`

A recorded webhook delivery attempt.

```typescript
interface WebhookDelivery {
  /** Provider-assigned delivery identifier. */
  id: string

  /** The webhook this delivery belongs to. */
  webhookId: string

  /** The event type that triggered this delivery. */
  event: string

  /** The payload that was delivered. */
  payload: unknown

  /** HTTP status code returned by the receiver. */
  status: number

  /** Whether the delivery was successful (2xx response). */
  success: boolean

  /** Round-trip delivery time in milliseconds. */
  duration: number

  /** When this delivery attempt occurred. */
  createdAt: Date
}
```

#### `WebhookDeliveryResult`

Result of delivering a webhook payload to a single endpoint.

```typescript
interface WebhookDeliveryResult {
  /** The webhook this delivery was sent to. */
  webhookId: string

  /** Provider-assigned delivery attempt identifier. */
  deliveryId: string

  /** HTTP status code returned by the receiver. */
  status: number

  /** Whether the delivery was successful (2xx response). */
  success: boolean

  /** Round-trip delivery time in milliseconds. */
  duration: number
}
```

#### `WebhookOptions`

Options for registering a webhook endpoint.

```typescript
interface WebhookOptions {
  /** Shared secret used to sign webhook payloads. Auto-generated if omitted. */
  secret?: string

  /** Custom HTTP headers to include with every delivery. */
  headers?: Record<string, string>

  /** Number of automatic retries on delivery failure (default: 3). */
  retryCount?: number
}
```

#### `WebhookProvider`

Webhook provider interface.

All webhook providers must implement this interface to provide
registration, dispatch, delivery logging, and retry capabilities.

```typescript
interface WebhookProvider {
  /**
   * Registers a new webhook endpoint to receive event notifications.
   *
   * @param url - Destination URL that will receive POST requests.
   * @param events - Event types to subscribe to.
   * @param options - Optional registration configuration.
   * @returns The created webhook registration.
   */
  register(url: string, events: string[], options?: WebhookOptions): Promise<WebhookRegistration>

  /**
   * Removes a webhook registration, stopping all future deliveries.
   *
   * @param webhookId - The webhook to unregister.
   */
  unregister(webhookId: string): Promise<void>

  /**
   * Dispatches an event payload to all webhooks subscribed to the event.
   *
   * @param event - The event type being dispatched.
   * @param payload - The event payload to deliver.
   * @returns Delivery results for each matching webhook.
   */
  dispatch(event: string, payload: unknown): Promise<WebhookDeliveryResult[]>

  /**
   * Lists all registered webhooks.
   *
   * @returns All webhook registrations.
   */
  list(): Promise<WebhookRegistration[]>

  /**
   * Retrieves the delivery log for a specific webhook.
   *
   * @param webhookId - The webhook to retrieve deliveries for.
   * @param options - Pagination options.
   * @returns Delivery attempts for the webhook.
   */
  getDeliveryLog(webhookId: string, options?: PaginationOptions): Promise<WebhookDelivery[]>

  /**
   * Retries a previously failed delivery attempt.
   *
   * @param deliveryId - The delivery attempt to retry.
   * @returns The result of the retry attempt.
   */
  retry(deliveryId: string): Promise<WebhookDeliveryResult>
}
```

#### `WebhookRegistration`

A registered webhook endpoint.

```typescript
interface WebhookRegistration {
  /** Provider-assigned webhook identifier. */
  id: string

  /** Destination URL that receives webhook payloads. */
  url: string

  /** Event types this webhook is subscribed to. */
  events: string[]

  /** Shared secret used to sign payloads for this webhook. */
  secret: string

  /** Whether this webhook is currently active. */
  active: boolean

  /** When this webhook was registered. */
  createdAt: Date
}
```

### Functions

#### `dispatch(event, payload)`

Dispatches an event payload to all webhooks subscribed to the event.

```typescript
function dispatch(event: string, payload: unknown): Promise<WebhookDeliveryResult[]>
```

- `event` — The event type being dispatched.
- `payload` — The event payload to deliver.

**Returns:** Delivery results for each matching webhook.

#### `getDeliveryLog(webhookId, options)`

Retrieves the delivery log for a specific webhook.

```typescript
function getDeliveryLog(webhookId: string, options?: PaginationOptions): Promise<WebhookDelivery[]>
```

- `webhookId` — The webhook to retrieve deliveries for.
- `options` — Pagination options.

**Returns:** Delivery attempts for the webhook.

#### `getProvider()`

Retrieves the bonded webhook provider, throwing if none is configured.

```typescript
function getProvider(): WebhookProvider
```

**Returns:** The bonded webhook provider.

#### `hasProvider()`

Checks whether a webhook provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a webhook provider is bonded.

#### `list()`

Lists all registered webhooks.

```typescript
function list(): Promise<WebhookRegistration[]>
```

**Returns:** All webhook registrations.

#### `register(url, events, options)`

Registers a new webhook endpoint to receive event notifications.

```typescript
function register(url: string, events: string[], options?: WebhookOptions): Promise<WebhookRegistration>
```

- `url` — Destination URL that will receive POST requests.
- `events` — Event types to subscribe to.
- `options` — Optional registration configuration.

**Returns:** The created webhook registration.

#### `retry(deliveryId)`

Retries a previously failed delivery attempt.

```typescript
function retry(deliveryId: string): Promise<WebhookDeliveryResult>
```

- `deliveryId` — The delivery attempt to retry.

**Returns:** The result of the retry attempt.

#### `setProvider(provider)`

Registers a webhook provider as the active singleton. Called by bond
packages during application startup.

```typescript
function setProvider(provider: WebhookProvider): void
```

- `provider` — The webhook provider implementation to bond.

#### `unregister(webhookId)`

Removes a webhook registration, stopping all future deliveries.

```typescript
function unregister(webhookId: string): Promise<void>
```

- `webhookId` — The webhook to unregister.

**Returns:** Resolves when the webhook has been unregistered.

## Available Providers

| Provider | Package |
|----------|---------|
| Capture | `@molecule/api-webhook-capture` |
| Webhook | `@molecule/api-webhook-http` |
| Webhook | `@molecule/api-webhook-queue` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

This is OUTBOUND webhook DISPATCH — your app POSTing events to endpoints your users
register. (Verifying an INBOUND provider webhook, e.g. Stripe's, is the opposite
direction — you verify ITS signature; see `@molecule/api-payments`.) A weak dispatch
integration is an SSRF hole and a spoofable firehose:

- **The destination URL is untrusted → SSRF.** A user-supplied {@link register} URL can
  point at `localhost`, a private range (`10.`/`192.168.`/`127.`), or the cloud metadata
  IP `169.254.169.254`. Validate + allowlist the scheme/host and BLOCK private/link-local
  targets BEFORE registering/dispatching, or a user can read internal services.
- **Deliveries are signed — share the secret so receivers verify.** The provider signs
  each payload with {@link WebhookRegistration.secret} (from {@link WebhookOptions.secret},
  auto-generated if omitted). Give that secret to the receiver so they can check the HMAC
  header; an unverified webhook on the receiving end is spoofable.
- **Scope registrations to their owner.** Persist the returned {@link WebhookRegistration}
  id with the owner's `user_id` and scope list/delete by it — an unscoped list/delete is
  an IDOR.
- **Send only what the event needs.** Never put secrets, tokens, or unrelated PII in the
  payload — it leaves your system.
