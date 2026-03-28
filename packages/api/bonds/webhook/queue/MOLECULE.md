# @molecule/api-webhook-queue

Queue-backed webhook provider for molecule.dev.

Implements the `@molecule/api-webhook` interface using an internal job queue
with exponential backoff retries and configurable concurrency.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-webhook-queue
```

## Usage

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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-webhook` 1.0.0
