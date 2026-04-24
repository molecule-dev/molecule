# @molecule/api-webhook-http

HTTP webhook provider for molecule.dev.

Implements the `@molecule/api-webhook` interface using direct HTTP POST
delivery with HMAC signature verification and automatic retries.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-webhook'
import { createProvider } from '@molecule/api-webhook-http'

// Bond at startup
setProvider(createProvider())

// Or with custom configuration
setProvider(createProvider({
  timeout: 10_000,
  retryCount: 5,
  retryDelay: 2000,
}))
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-webhook-http
```

## API

### Interfaces

#### `HttpWebhookConfig`

Configuration for the HTTP webhook provider.

```typescript
interface HttpWebhookConfig {
  /** HTTP request timeout in milliseconds. Defaults to 30000 (30 seconds). */
  timeout?: number

  /** Default number of automatic retries on delivery failure. Defaults to 3. */
  retryCount?: number

  /** Delay between retry attempts in milliseconds. Defaults to 1000. */
  retryDelay?: number

  /** HTTP header name used to send the HMAC payload signature. Defaults to `'x-webhook-signature'`. */
  signatureHeader?: string
}
```

### Functions

#### `createProvider(config)`

Creates an HTTP-backed {@link WebhookProvider}.

Webhook registrations and delivery logs are stored in memory.
For persistent storage, use `@molecule/api-webhook-queue` instead.

```typescript
function createProvider(config?: HttpWebhookConfig): WebhookProvider
```

- `config` — HTTP webhook provider configuration.

**Returns:** A fully initialised `WebhookProvider` backed by direct HTTP delivery.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-webhook` 1.0.0
