# @molecule/api-webhook-queue

Queue-backed webhook provider for molecule.dev.

Implements the `@molecule/api-webhook` interface using an internal job queue
with exponential backoff retries and configurable concurrency.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-webhook'
import { createProvider } from '@molecule/api-webhook-queue'

// Bond at startup
setProvider(createProvider())

// Or with custom configuration
setProvider(createProvider({
  maxRetries: 10,
  baseDelay: 2000,
  concurrency: 5,
}))
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-webhook-queue @molecule/api-webhook undici
```

## API

### Interfaces

#### `QueueWebhookConfig`

Configuration for the queue-backed webhook provider.

```typescript
interface QueueWebhookConfig {
  /** HTTP request timeout in milliseconds. Defaults to 30000 (30 seconds). */
  timeout?: number

  /** Maximum number of retry attempts per delivery. Defaults to 5. */
  maxRetries?: number

  /** Base delay for exponential backoff in milliseconds. Defaults to 1000. */
  baseDelay?: number

  /** Maximum delay cap for exponential backoff in milliseconds. Defaults to 60000. */
  maxDelay?: number

  /** Maximum number of concurrent deliveries. Defaults to 10. */
  concurrency?: number

  /** HTTP header name used to send the HMAC payload signature. Defaults to `'x-webhook-signature'`. */
  signatureHeader?: string
}
```

### Types

#### `JobStatus`

Internal state of a queued delivery job.

```typescript
type JobStatus = 'pending' | 'processing' | 'completed' | 'failed'
```

### Functions

#### `createProvider(config)`

Creates a queue-backed {@link WebhookProvider}.

```typescript
function createProvider(config?: QueueWebhookConfig): WebhookProvider
```

- `config` — Queue webhook provider configuration.

**Returns:** A fully initialised `WebhookProvider` with queue-based delivery.

#### `isPrivateAddress(ip)`

True if `ip` (a literal IPv4/IPv6 string) is private/internal/metadata.

```typescript
function isPrivateAddress(ip: string): boolean
```

#### `isPrivateIPv4(ip)`

True for an IPv4 address in any private/loopback/link-local/CGNAT/reserved range.

```typescript
function isPrivateIPv4(ip: string): boolean
```

#### `isPrivateIPv6(ip)`

True for an IPv6 loopback/unspecified/unique-local/link-local (or mapped-private v4).

```typescript
function isPrivateIPv6(ip: string): boolean
```

#### `safeFetch(rawUrl, init)`

SSRF-safe replacement for `fetch` when the URL is (or derives from) untrusted input.
Only http(s) is allowed; the connection is pinned away from private/internal/metadata
addresses (both IP-literal hosts — checked synchronously since they skip DNS — and
hostnames — validated inside the connect lookup). Redirects are not auto-followed so
a 3xx cannot rebind to an internal host.

```typescript
function safeFetch(rawUrl: string, init?: RequestInit): Promise<Response>
```

- `rawUrl` — The (untrusted) URL to fetch.
- `init` — Standard fetch init.

**Returns:** The fetch Response.

## Core Interface
Implements `@molecule/api-webhook` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-webhook` 1.0.0

### Runtime Dependencies

- `@molecule/api-webhook`
- `undici`

- **`dispatch()` returns an ACCEPTANCE receipt, NOT a delivery result.** It
  enqueues one job per matching registration and immediately returns
  `{ status: 202, success: true, deliveryId }` per registration: `202` means
  QUEUED (accepted for async delivery), NOT delivered, and `success` means
  "successfully enqueued" — neither claims the receiver was reached. The real
  per-delivery outcome (the receiver's 2xx/failure) is recorded asynchronously;
  poll `getDeliveryLog(webhookId)` and match on the returned `deliveryId` for
  the final status. A delivery that later FAILS is recorded as `success: false`
  in the log and is never reported as a success. (Need the delivery outcome
  synchronously? Use `@molecule/api-webhook-http`, which delivers inline and
  returns the real result.)
- **`WebhookOptions.retryCount` is HONORED, per registration.** Each webhook
  retries up to its own `retryCount` on failure (captured at register time;
  defaults to the provider-level `maxRetries`, default 5) with exponential
  backoff between `baseDelay` and `maxDelay`. The provider `maxRetries` is only
  the default for registrations that omit `retryCount`.
- **All state is in-memory — NOT durable.** registrations, delivery logs, and
  the job queue itself are plain in-memory structures. A restart LOSES
  registrations AND any pending/in-flight deliveries; this bond adds async
  delivery + backoff over the http bond, not durability. Do NOT build a
  delivery-reliability guarantee on it — persist registrations yourself and
  re-register at boot, and back it with a durable queue/store if you need
  at-least-once delivery across restarts.
- Same delivery format and connect-time SSRF guard as
  `@molecule/api-webhook-http`: JSON POST with `x-webhook-event` +
  hex HMAC-SHA256 of the body in `x-webhook-signature` (configurable),
  private/metadata destinations refused at connect (failed deliveries in
  the log, never a throw).

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Registering a webhook endpoint through the app's UI/API succeeds, and
  an event the app dispatches actually produces a delivery. The sandbox
  CAPTURES outbound deliveries instead of POSTing — read them with the
  `read_activity` tool (filter type 'webhook'); never mock the dispatch or
  modify production code to expose the payload.
- [ ] The captured delivery carries the signature header (derived from the
  registration's secret) and an event payload free of secrets/unrelated PII.
- [ ] A registration targeting a private/link-local/metadata destination
  (`localhost`, `10.…`, `169.254.169.254`) is REJECTED before any dispatch.
