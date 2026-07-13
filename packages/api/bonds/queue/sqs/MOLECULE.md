# @molecule/api-queue-sqs

AWS SQS queue provider for molecule.dev.

Uses `AWS_REGION` (default `us-east-1`) with the standard AWS credential
chain; set `SQS_ENDPOINT` to target LocalStack. Queue URLs are resolved
lazily on first operation — the queue must already exist (create it with
`createQueue()` or in AWS) or the first send/receive rejects with the AWS
`QueueDoesNotExist` error. Pass `{ autoCreateQueues: true }` to
`createProvider()` to auto-create a standard queue on first use instead
(opt-in — unlike the memory/redis bonds, silently creating AWS resources
has cost/IAM implications, so it is never the default).

## Quick Start

```typescript
import { setProvider, send, subscribe } from '@molecule/api-queue'
import { provider } from '@molecule/api-queue-sqs'

setProvider(provider)

subscribe<{ userId: string }>('emails', async (message) => {
  await deliver(message.body) // returning normally acks (deletes) the message
})

await send('emails', { body: { userId: 'u1' } })
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-queue-sqs
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

#### `SQSOptions`

Options for creating an SQS queue provider.

```typescript
interface SQSOptions {
  region?: string
  accessKeyId?: string
  secretAccessKey?: string
  endpoint?: string
  accountId?: string

  /**
   * When `true`, resolving a queue name that does not yet exist in AWS
   * auto-creates a standard (non-FIFO) queue with default settings instead
   * of rejecting with `QueueDoesNotExist` — matching the memory/redis
   * bonds' "just works" first-send behavior. Off by default: unlike an
   * in-process or self-hosted broker, silently creating AWS resources has
   * cost and IAM-permission implications, so opting in is a deliberate
   * choice. When off (the default), create the queue via `createQueue()`,
   * the AWS console, or infrastructure-as-code before sending to it.
   */
  autoCreateQueues?: boolean
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

Creates an AWS SQS queue provider. Connects using `AWS_REGION` env var (default `'us-east-1'`),
optional explicit credentials, and optional custom endpoint (e.g. for LocalStack).

```typescript
function createProvider(options?: SQSOptions): QueueProvider
```

- `options` — Optional AWS region, credentials, endpoint, and auto-create configuration. Falls back to environment variables.

**Returns:** A `QueueProvider` that manages SQS queues. Queue URLs are resolved lazily on first operation.

### Constants

#### `provider`

Lazily-initialized SQS queue provider proxy that creates the provider on first access.

```typescript
const provider: QueueProvider
```

#### `queueSqsSecretDefinitions`

Secret definitions required by the SQS queue bond.

```typescript
const queueSqsSecretDefinitions: SecretDefinition[]
```

## Core Interface
Implements `@molecule/api-queue` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-queue'
import { provider } from '@molecule/api-queue-sqs'

export function setupQueueSqs(): void {
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

- `AWS_REGION` *(required)* — AWS region — default: `us-east-1`
  - Setup: The AWS region your resources live in.
  - Example: `us-east-1`
- `AWS_ACCESS_KEY_ID` *(required)* — AWS access key ID
  - Setup: Create an IAM user with the needed policy (SES/S3/SQS) and create an access key under Security credentials.
  - Get it here: [https://console.aws.amazon.com/iam/](https://console.aws.amazon.com/iam/)
  - Example: `AKIA...`
- `AWS_SECRET_ACCESS_KEY` *(required)* — AWS secret access key
  - Setup: Shown once when creating the IAM access key — store it immediately.
  - Get it here: [https://console.aws.amazon.com/iam/](https://console.aws.amazon.com/iam/)
- `SQS_QUEUE_URL` *(required)* — SQS queue URL
  - Setup: Create a queue in the SQS console and copy its URL.
  - Get it here: [https://console.aws.amazon.com/sqs/](https://console.aws.amazon.com/sqs/)
  - Example: `https://sqs.us-east-1.amazonaws.com/123456789012/my-queue`

Delivery semantics (at-least-once — handlers must be idempotent):

- **Handler success acks (deletes) automatically**; a handler throw leaves
  the message leased, and it returns to the queue when the visibility
  timeout expires (throw = retry). Bound poison messages with a redrive
  policy: `createQueue(name, { deadLetterQueue: { name, maxReceiveCount } })`.
- `ack()`/`nack()` settle at most once; `nack()` returns the message to the
  queue immediately (visibility timeout 0) instead of waiting out the lease.
- FIFO queues need the `.fifo` suffix (`createQueue(name, { fifo: true })`
  appends it) and a `groupId` per message; a `deduplicationId` is derived
  from the message id when not provided.
- `delaySeconds` is capped at 900 (15 minutes) by SQS itself.
- `subscribe()` retries a failed queue-URL resolution (bad region,
  credentials not yet propagated, a `QueueDoesNotExist` race) with bounded
  exponential backoff (1s → 30s) instead of logging once and leaving the
  subscription permanently dead — it self-heals once the queue/credentials
  become valid.
