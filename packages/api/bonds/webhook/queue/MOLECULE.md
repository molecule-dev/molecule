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
npm install @molecule/api-webhook-queue
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
