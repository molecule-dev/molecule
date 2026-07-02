# @molecule/api-queue-memory

In-memory queue provider for molecule.dev.

A zero-dependency, zero-configuration, in-process queue provider for
development and testing — no broker, no credentials, no environment
variables. Implements the full `@molecule/api-queue` contract with
SQS-style semantics: named queues, at-least-once delivery via visibility
leases, delayed messages (`delaySeconds`), redelivery on subscriber
handler failure or `nack()`, a bounded delivery cap with optional
dead-letter routing, FIFO group ordering + deduplication, long-polling
`receive()`, and `maxMessages`-bounded subscriber concurrency.

## Quick Start

```typescript
import { setProvider, queue } from '@molecule/api-queue'
import { provider } from '@molecule/api-queue-memory'

setProvider(provider) // no configuration, no env vars

const emails = queue('emails')
const unsubscribe = emails.subscribe(async (message) => {
  await deliver(message.body)
  await message.ack() // handler success also auto-acks
})

await emails.send({ body: { to: 'a@b.c' } })
await emails.send({ body: { to: 'later@b.c' }, delaySeconds: 60 })
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-queue-memory
```

## API

### Interfaces

#### `MemoryQueueConfig`

Internal configuration for a single in-memory queue instance, resolved by
the provider from `MemoryQueueOptions` and per-queue `QueueCreateOptions`.

```typescript
interface MemoryQueueConfig {
  /**
   * Default visibility timeout in seconds for leases without an explicit
   * `ReceiveOptions.visibilityTimeout`.
   */
  defaultVisibilityTimeoutSeconds: number

  /**
   * Maximum deliveries before dead-lettering/dropping. Overridden per queue
   * by `deadLetterQueue.maxReceiveCount` when a dead-letter queue is set.
   */
  maxReceiveCount: number

  /**
   * Delay in seconds before redelivery after handler failure or `nack()`.
   */
  redeliveryDelaySeconds: number

  /**
   * Whether this queue enforces FIFO semantics (per-`groupId` ordered,
   * head-of-line-blocking delivery plus `deduplicationId` deduplication).
   */
  fifo: boolean

  /**
   * Optional retention period in seconds; messages older than this are
   * discarded when next scanned.
   */
  messageRetentionSeconds?: number

  /**
   * Optional dead-letter queue for messages exceeding the delivery cap.
   */
  deadLetterQueue?: QueueCreateOptions['deadLetterQueue']

  /**
   * Resolves another queue by name — used to route dead-lettered messages.
   */
  resolveQueue: (name: string) => Queue
}
```

#### `MemoryQueueHandle`

Handle pairing a `Queue` with the internal lifecycle control the provider
uses to shut it down (`close()` is not part of the core `Queue` interface).

```typescript
interface MemoryQueueHandle {
  /**
   * The in-memory queue implementation.
   */
  queue: Queue

  /**
   * Stops all timers, resolves pending long-polls with `[]`, discards all
   * messages and subscribers, and rejects further sends.
   */
  close(): void
}
```

#### `MemoryQueueOptions`

Options for creating an in-memory queue provider.

All options have working defaults — the provider is fully functional with
zero configuration and zero environment variables.

```typescript
interface MemoryQueueOptions {
  /**
   * Default visibility timeout in seconds applied to received/dispatched
   * messages when `ReceiveOptions.visibilityTimeout` is not given.
   * A leased (in-flight) message whose lease expires without an `ack()`
   * becomes visible again and is redelivered (at-least-once delivery).
   * Defaults to `30`.
   */
  visibilityTimeoutSeconds?: number

  /**
   * Maximum number of times a message may be delivered before it is routed
   * to the queue's dead-letter queue (when configured via
   * `QueueCreateOptions.deadLetterQueue`) or dropped with an error log.
   * Mirrors the Redis bond's `attempts: 3`. Defaults to `3`.
   */
  maxReceiveCount?: number

  /**
   * Delay in seconds before a message is redelivered after a subscriber
   * handler failure or a `nack()`. Defaults to `0` (immediate redelivery).
   */
  redeliveryDelaySeconds?: number
}
```

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

### Types

#### `MessageHandler`

Async callback invoked for each message received from a queue subscription.

```typescript
type MessageHandler<T = unknown> = (message: ReceivedMessage<T>) => Promise<void>;
```

### Functions

#### `createProvider(options)`

Creates an in-memory queue provider. Queues are created implicitly on first
access (like the Redis bond) or explicitly via `createQueue()` with FIFO,
visibility-timeout, retention, and dead-letter options. All state lives in
this process and is lost on restart.

```typescript
function createProvider(options?: MemoryQueueOptions): QueueProvider
```

- `options` — Optional delivery defaults (visibility timeout, delivery cap, redelivery delay). Everything defaults sensibly — no configuration is required.

**Returns:** A `QueueProvider` backed by in-process queues.

### Constants

#### `provider`

Lazily-initialized in-memory queue provider proxy that creates the provider on first access.

```typescript
const provider: QueueProvider
```

## Core Interface
Implements `@molecule/api-queue` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-queue'
import { provider } from '@molecule/api-queue-memory'

export function setupQueueMemory(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-queue` ^1.0.0

Single-process and DEV-ONLY. Messages live in this process's memory: there
is NO persistence (everything is lost on restart) and NO cross-instance
delivery, so it must not be used for multi-instance production — swap in
`@molecule/api-queue-redis`, `@molecule/api-queue-rabbitmq`, or
`@molecule/api-queue-sqs` for production workloads. Delivery is
at-least-once: a message whose visibility lease expires without `ack()` is
redelivered (with an incremented `receiveCount`), and a message delivered
more than `maxReceiveCount` times (default 3) is routed to the queue's
dead-letter queue when one was configured via `createQueue()` — otherwise
it is dropped with an error log. Message bodies are `structuredClone`d on
send and per delivery (like a real broker's serialization), so bodies must
be structured-cloneable and post-send mutations never leak to consumers.
`QueueCreateOptions.maxMessageSize` is not enforced (nothing is
serialized). `close()` clears all timers, resolves pending long-polls with
`[]`, and stops all delivery.
