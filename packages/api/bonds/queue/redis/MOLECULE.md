# @molecule/api-queue-redis

Redis/BullMQ queue provider for molecule.dev.

Connects via `REDIS_URL` (or `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`,
defaulting to `localhost:6379`). Queues are created implicitly on first
access; keys are prefixed with `molecule:queue:` by default.

## Quick Start

```typescript
import { setProvider, send, subscribe } from '@molecule/api-queue'
import { provider } from '@molecule/api-queue-redis'

setProvider(provider) // connects lazily using REDIS_* env vars

subscribe<{ userId: string }>('emails', async (message) => {
  await deliver(message.body) // returning normally acks the message
})

await send('emails', { body: { userId: 'u1' } })
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-queue-redis @molecule/api-bond @molecule/api-queue @molecule/api-secrets bullmq
```

## API

### Interfaces

#### `Queue`

Handle for a named queue, providing send, receive, and subscribe operations.

```typescript
interface Queue {
    /**
     * Queue name.
     */
    name: string;
    /**
     * Sends a message to the queue.
     */
    send<T = unknown>(message: QueueMessage<T>): Promise<string>;
    /**
     * Sends multiple messages to the queue.
     */
    sendBatch?<T = unknown>(messages: QueueMessage<T>[]): Promise<string[]>;
    /**
     * Receives messages from the queue.
     */
    receive<T = unknown>(options?: ReceiveOptions): Promise<ReceivedMessage<T>[]>;
    /**
     * Subscribes to messages from the queue.
     * Returns a function to unsubscribe.
     */
    subscribe<T = unknown>(handler: MessageHandler<T>, options?: ReceiveOptions): () => void;
    /**
     * Gets the approximate number of messages in the queue.
     */
    size?(): Promise<number>;
    /**
     * Purges all messages from the queue.
     */
    purge?(): Promise<void>;
}
```

#### `QueueCreateOptions`

Options for creating a new queue, including FIFO mode, timeouts,
retention periods, and dead-letter queue configuration.

```typescript
interface QueueCreateOptions {
    /**
     * Whether this is a FIFO queue.
     */
    fifo?: boolean;
    /**
     * Default visibility timeout in seconds.
     */
    visibilityTimeout?: number;
    /**
     * Message retention period in seconds.
     */
    messageRetentionSeconds?: number;
    /**
     * Maximum message size in bytes.
     */
    maxMessageSize?: number;
    /**
     * Dead letter queue configuration.
     */
    deadLetterQueue?: {
        name: string;
        maxReceiveCount: number;
    };
}
```

#### `QueueMessage`

Message to be sent to a queue.

```typescript
interface QueueMessage<T = unknown> {
    /**
     * Message payload.
     */
    body: T;
    /**
     * Message ID (auto-generated if not provided).
     */
    id?: string;
    /**
     * Delay in seconds before the message becomes visible.
     */
    delaySeconds?: number;
    /**
     * Message attributes/headers.
     */
    attributes?: Record<string, string | number | boolean>;
    /**
     * Message group ID (for FIFO queues).
     */
    groupId?: string;
    /**
     * Deduplication ID (for FIFO queues).
     */
    deduplicationId?: string;
}
```

#### `QueueProvider`

Queue provider interface that all queue bond packages must implement.
Provides queue handle creation and optional queue management operations.

```typescript
interface QueueProvider {
    /**
     * Gets or creates a queue by name.
     */
    queue(name: string): Queue;
    /**
     * Lists all available queues.
     */
    listQueues?(): Promise<string[]>;
    /**
     * Creates a new queue.
     */
    createQueue?(name: string, options?: QueueCreateOptions): Promise<Queue>;
    /**
     * Deletes a queue.
     */
    deleteQueue?(name: string): Promise<void>;
    /**
     * Closes all connections.
     */
    close?(): Promise<void>;
}
```

#### `ReceivedMessage`

Received message from a queue.

```typescript
interface ReceivedMessage<T = unknown> {
    /**
     * Message ID.
     */
    id: string;
    /**
     * Message payload.
     */
    body: T;
    /**
     * Receipt handle for acknowledging the message.
     */
    receiptHandle: string;
    /**
     * Message attributes/headers.
     */
    attributes?: Record<string, string | number | boolean>;
    /**
     * Number of times this message has been received.
     */
    receiveCount?: number;
    /**
     * Timestamp when the message was sent.
     */
    sentTimestamp?: Date;
    /**
     * Acknowledges (deletes) the message from the queue.
     */
    ack(): Promise<void>;
    /**
     * Rejects the message (returns it to the queue).
     */
    nack?(): Promise<void>;
}
```

#### `ReceiveOptions`

Options for receiving messages.

```typescript
interface ReceiveOptions {
    /**
     * Maximum number of messages to receive.
     */
    maxMessages?: number;
    /**
     * Visibility timeout in seconds.
     */
    visibilityTimeout?: number;
    /**
     * Wait time in seconds for long polling.
     */
    waitTimeSeconds?: number;
}
```

#### `RedisQueueOptions`

Options for creating a Redis queue provider.

```typescript
interface RedisQueueOptions {
  url?: string
  host?: string
  port?: number
  password?: string
  prefix?: string
}
```

### Types

#### `MessageHandler`

Async callback invoked for each message received from a queue subscription.

```typescript
type MessageHandler<T = unknown> = (message: ReceivedMessage<T>) => Promise<void>;
```

### Functions

#### `createProvider(options)`

Creates a Redis/BullMQ queue provider. Connects to Redis using `REDIS_URL` or
individual `REDIS_HOST`/`PORT`/`PASSWORD` env vars. Queue names are prefixed with `molecule:queue:` by default.

The producer connection (send/receive/size/purge/delete) is configured to fail fast — a
bounded `maxRetriesPerRequest` and `enableOfflineQueue: false` — instead of buffering
commands indefinitely while Redis is unreachable, which previously made `await send()` hang
forever with no actionable error. The worker connection (`subscribe()`) keeps ioredis's
default indefinite-retry behavior — BullMQ requires `maxRetriesPerRequest: null` there, and
a long-running background consumer SHOULD keep trying to reconnect rather than give up.

```typescript
function createProvider(options?: RedisQueueOptions): QueueProvider
```

- `options` — Optional connection and prefix configuration. Falls back to environment variables.

**Returns:** A `QueueProvider` that manages BullMQ queues backed by Redis.

### Constants

#### `provider`

Lazily-initialized Redis/BullMQ queue provider proxy that creates the provider on first access.

```typescript
const provider: QueueProvider
```

#### `queueRedisSecretDefinitions`

Secret definitions required by the Redis queue bond.

```typescript
const queueRedisSecretDefinitions: SecretDefinition[]
```

## Core Interface
Implements `@molecule/api-queue` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-queue'
import { provider } from '@molecule/api-queue-redis'

export function setupQueueRedis(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-queue` ^1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `REDIS_URL` *(optional)* — Redis connection URL — default: `redis://localhost:6379`
  - **Provisioned automatically in molecule.dev sandboxes** — manual setup only needed outside the platform.
  - Setup: Redis connection string (redis:// or rediss:// for TLS). molecule.dev runs a Redis inside your app's container automatically (dev and production) — set this only to use an external/managed Redis; locally, the Docker Compose default works.
  - Example: `redis://localhost:6379`

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-queue`
- `@molecule/api-secrets`
- `bullmq`

Delivery semantics (at-least-once — handlers must be idempotent):

- **Handler success acks automatically** (the BullMQ processor completing IS
  the ack); a handler throw or `nack()` fails the job and BullMQ retries it
  up to 3 attempts with exponential backoff (1s base), after which it stays
  in the failed set (inspectable — not silently dropped).
- **`receive()` is a PEEK, not a lease**: it returns jobs from the waiting
  list without locking them, so `ReceiveOptions.visibilityTimeout` has no
  effect (a warning is logged if you pass it) and a concurrently running
  `subscribe()` worker can process a job you are holding. Prefer
  `subscribe()` for real consumption; use `receive()` + `ack()` only in
  single-consumer flows.
- **`QueueMessage.attributes` round-trip through `receive()`/`subscribe()`**
  (persisted in a small versioned envelope inside `job.data`) — the
  received `attributes` are your own data, never BullMQ's internal
  `job.opts` (retry/backoff settings). A job already in Redis from before
  this envelope existed decodes as a plain body with `attributes:
  undefined`, so upgrading is safe with jobs in flight.
- **`deduplicationId` maps onto BullMQ's native job-id dedup**: when set
  without an explicit `message.id`, it becomes the BullMQ job id, so a
  second `send()` with the same `deduplicationId` is a no-op — the closest
  real equivalent to SQS FIFO deduplication this backend has. `groupId`
  has no effect (BullMQ has no FIFO-group/ordering concept).
- Providing a `message.id` (or `deduplicationId`) that was ever used before
  (even for a completed job that has not been cleaned up) makes the send a
  silent no-op — ids must be unique per logical job, e.g.
  `` `welcome-${userId}` ``.
- **Redis being unreachable fails fast for producer calls** (`send`,
  `sendBatch`, `receive`, `size`, `purge`, `deleteQueue`) instead of
  hanging forever on ioredis's default offline command buffer — the
  rejection names `REDIS_URL`/`REDIS_HOST` so the failure is actionable.
  The `subscribe()` worker connection intentionally keeps retrying
  indefinitely in the background (appropriate for a long-running
  consumer) — BullMQ requires this for its blocking connection regardless.

## E2E Tests

Integration checklist — exercise the REAL behavior end-to-end (drive the app
action that enqueues/consumes work in the live preview, no mocks), adapt each
item to this app's actual screens/flows, and check every box off one by one. A
box you can't check is an integration bug to fix — not a skip:
- [ ] The action that enqueues work responds fast — `send()` returns a message
  id immediately and the request/response does NOT block on the job. The #1
  trap: the executor awaits the heavy work inline (defeating the queue);
  confirm the triggering UI action returns quickly and the work happens in the
  background.
- [ ] The enqueued job actually RUNS — a `subscribe()` consumer (a
  `MessageHandler`) is wired and running, so the message's real side effect
  (email sent, file processed, notification delivered — whatever the app does)
  actually appears in the UI/data. A message enqueued with no worker wired is
  the silent failure.
- [ ] Payload round-trips intact — the `ReceivedMessage.body` the handler sees
  equals the `QueueMessage.body` that was sent, with no dropped or renamed
  fields.
- [ ] Failure is handled — a handler that throws is redelivered (up to
  `QueueCreateOptions.deadLetterQueue.maxReceiveCount`, tracked via
  `receiveCount`) or dead-lettered, never silently lost. Delivery is
  at-least-once, so the handler is idempotent (dedupe on the job/record id) — a
  redelivery must not double-charge or double-send.
- [ ] Ordering/concurrency is not assumed — the app does not rely on strict
  FIFO (`QueueMessage.groupId`/`fifo`) or exactly-once delivery unless the
  bonded provider actually guarantees it.
- [ ] Least-authority payloads — the `body` carries only the ids/refs the job
  needs (never a secret or stale authority); the consumer re-loads and
  re-scopes on the CURRENT data (owner id from `body`, re-checked server-side)
  so one user's job cannot act on another user's resource.
