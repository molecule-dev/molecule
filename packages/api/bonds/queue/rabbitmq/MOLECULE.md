# @molecule/api-queue-rabbitmq

RabbitMQ queue provider for molecule.dev.

Connects via `RABBITMQ_URL` (or `RABBITMQ_HOST`/`PORT`/`USER`/`PASSWORD`/`VHOST`,
defaulting to `amqp://guest:guest@localhost:5672/`). The default `provider`
export connects lazily on first use; queues are asserted durable on demand.

## Quick Start

```typescript
import { setProvider, send, subscribe } from '@molecule/api-queue'
import { provider } from '@molecule/api-queue-rabbitmq'

setProvider(provider) // connects on first operation using RABBITMQ_* env vars

subscribe<{ userId: string }>('emails', async (message) => {
  await deliver(message.body) // returning normally acks the message
})

await send('emails', { body: { userId: 'u1' } })
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-queue-rabbitmq @molecule/api-bond @molecule/api-i18n @molecule/api-queue @molecule/api-secrets amqplib
npm install -D @types/amqplib
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

#### `RabbitMQOptions`

Options for creating a RabbitMQ queue provider.

```typescript
interface RabbitMQOptions {
  url?: string
  host?: string
  port?: number
  username?: string
  password?: string
  vhost?: string
  prefetch?: number
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

Creates a RabbitMQ queue provider by connecting to an AMQP server and opening a channel.
Connection URL is built from `RABBITMQ_URL` or individual `RABBITMQ_HOST`/`PORT`/`USER`/`PASSWORD`/`VHOST` env vars.

The FIRST connection attempt fails fast (rejects) so a bad URL/unreachable broker is caught
immediately at boot — matching the fail-fast pattern used elsewhere in the fleet. Once connected,
a dropped connection OR a channel-killing broker error (e.g. re-asserting a queue with mismatched
arguments) is recovered automatically with bounded exponential backoff, and every active
`subscribe()` consumer is re-attached to the fresh channel — a single failure no longer
permanently breaks every queue for the life of the process.

```typescript
function createProvider(options?: RabbitMQOptions): Promise<QueueProvider>
```

- `options` — Optional connection and prefetch configuration. Falls back to environment variables.

**Returns:** A `QueueProvider` that manages RabbitMQ queues over the established AMQP channel.

### Constants

#### `connect`

Alias for `createProvider`. Connects to RabbitMQ and returns a `QueueProvider`.

```typescript
const connect: (options?: RabbitMQOptions) => Promise<QueueProvider>
```

#### `provider`

Default lazily-initialized RabbitMQ provider. The AMQP connection is established
on first method call. All methods proxy through to the real provider once connected.
Queue operations issued before the connection is ready are deferred automatically.

```typescript
const provider: QueueProvider
```

#### `queueRabbitmqSecretDefinitions`

Secret definitions required by the RabbitMQ queue bond.

```typescript
const queueRabbitmqSecretDefinitions: SecretDefinition[]
```

## Core Interface
Implements `@molecule/api-queue` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-queue'
import { provider } from '@molecule/api-queue-rabbitmq'

export function setupQueueRabbitmq(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-queue` ^1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `RABBITMQ_URL` *(required)* — RabbitMQ connection URL — default: `amqp://localhost`
  - Setup: AMQP connection URL of your RabbitMQ instance.
  - Example: `amqp://guest:guest@localhost:5672`

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-i18n`
- `@molecule/api-queue`
- `@molecule/api-secrets`
- `amqplib`

Delivery semantics (at-least-once — handlers must be idempotent):

- **Handler success acks automatically**; explicit `ack()`/`nack()` are only
  needed to settle early, and are idempotent (a second settlement of the same
  delivery is a safe no-op — a raw double-ack would close the AMQP channel).
- **A handler throw = one immediate requeue.** A message that fails again
  after redelivery is routed to the queue's dead-letter exchange when one was
  configured (`createQueue(name, { deadLetterQueue })`) — otherwise it is
  DROPPED. Configure a dead-letter queue for anything you cannot afford to lose.
- **`delaySeconds` works out of the box — no `rabbitmq-delayed-message-exchange`
  plugin required.** A message with `delaySeconds` is parked on a
  per-delay wait queue (named `<queue>.delay.<ms>`, created on demand)
  whose `x-message-ttl` equals the delay; once the TTL expires the broker
  dead-letters it back to the real queue via the default exchange. Every
  distinct delay value gets its own wait queue, so mixed delays on the
  same logical queue never hit RabbitMQ's "TTL only expires at the head"
  staggering gotcha. The wait queues are an implementation detail — do
  not publish to them directly, and expect one extra durable queue per
  distinct `delaySeconds` value your app actually uses.
- **A connection drop or a channel-killing broker error auto-recovers**
  with bounded exponential backoff (1s → 30s), and every active
  `subscribe()` consumer is re-attached once reconnected — a transient
  broker restart no longer permanently breaks every queue for the life of
  the process. The very FIRST connection attempt (inside `createProvider`)
  still fails fast (rejects) so a bad `RABBITMQ_URL` is caught immediately
  at boot instead of retrying silently forever.
- `receive()` is pull-based (`channel.get`); `ReceiveOptions.waitTimeSeconds`
  and `visibilityTimeout` are not supported by AMQP semantics — unacked
  messages return to the queue when the channel/connection closes, not on a
  timer.

## Translations

Translation strings are provided by `@molecule/api-locales-queue-rabbitmq`.
