# @molecule/api-queue

Queue/messaging core interface for molecule.dev.

Defines the standard interface for queue providers.

## Quick Start

```ts
import { send, subscribe } from '@molecule/api-queue'

await send('emails', { body: { userId, kind: 'welcome' } }) // an id, not the email body/secret

subscribe('emails', async (msg) => {
  const user = await findById('users', msg.body.userId) // re-load server-side; re-scope
  if (user?.welcomeSentAt) return // idempotent — already done, skip the redelivery
  await sendMail({ from, to: user.email, subject: 'Welcome' })
  await updateById('users', user.id, { welcomeSentAt: Date.now() })
})
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-queue
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
  name: string

  /**
   * Sends a message to the queue.
   */
  send<T = unknown>(message: QueueMessage<T>): Promise<string>

  /**
   * Sends multiple messages to the queue.
   */
  sendBatch?<T = unknown>(messages: QueueMessage<T>[]): Promise<string[]>

  /**
   * Receives messages from the queue.
   */
  receive<T = unknown>(options?: ReceiveOptions): Promise<ReceivedMessage<T>[]>

  /**
   * Subscribes to messages from the queue.
   * Returns a function to unsubscribe.
   */
  subscribe<T = unknown>(handler: MessageHandler<T>, options?: ReceiveOptions): () => void

  /**
   * Gets the approximate number of messages in the queue.
   */
  size?(): Promise<number>

  /**
   * Purges all messages from the queue.
   */
  purge?(): Promise<void>
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
  fifo?: boolean

  /**
   * Default visibility timeout in seconds.
   */
  visibilityTimeout?: number

  /**
   * Message retention period in seconds.
   */
  messageRetentionSeconds?: number

  /**
   * Maximum message size in bytes.
   */
  maxMessageSize?: number

  /**
   * Dead letter queue configuration.
   */
  deadLetterQueue?: {
    name: string
    maxReceiveCount: number
  }
}
```

#### `QueueMessage`

Message to be sent to a queue.

```typescript
interface QueueMessage<T = unknown> {
  /**
   * Message payload.
   */
  body: T

  /**
   * Message ID (auto-generated if not provided).
   */
  id?: string

  /**
   * Delay in seconds before the message becomes visible.
   */
  delaySeconds?: number

  /**
   * Message attributes/headers.
   */
  attributes?: Record<string, string | number | boolean>

  /**
   * Message group ID (for FIFO queues).
   */
  groupId?: string

  /**
   * Deduplication ID (for FIFO queues).
   */
  deduplicationId?: string
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
  queue(name: string): Queue

  /**
   * Lists all available queues.
   */
  listQueues?(): Promise<string[]>

  /**
   * Creates a new queue.
   */
  createQueue?(name: string, options?: QueueCreateOptions): Promise<Queue>

  /**
   * Deletes a queue.
   */
  deleteQueue?(name: string): Promise<void>

  /**
   * Closes all connections.
   */
  close?(): Promise<void>
}
```

#### `ReceivedMessage`

Received message from a queue.

```typescript
interface ReceivedMessage<T = unknown> {
  /**
   * Message ID.
   */
  id: string

  /**
   * Message payload.
   */
  body: T

  /**
   * Receipt handle for acknowledging the message.
   */
  receiptHandle: string

  /**
   * Message attributes/headers.
   */
  attributes?: Record<string, string | number | boolean>

  /**
   * Number of times this message has been received.
   */
  receiveCount?: number

  /**
   * Timestamp when the message was sent.
   */
  sentTimestamp?: Date

  /**
   * Acknowledges (deletes) the message from the queue.
   */
  ack(): Promise<void>

  /**
   * Rejects the message (returns it to the queue).
   */
  nack?(): Promise<void>
}
```

#### `ReceiveOptions`

Options for receiving messages.

```typescript
interface ReceiveOptions {
  /**
   * Maximum number of messages to receive.
   */
  maxMessages?: number

  /**
   * Visibility timeout in seconds.
   */
  visibilityTimeout?: number

  /**
   * Wait time in seconds for long polling.
   */
  waitTimeSeconds?: number
}
```

### Types

#### `MessageHandler`

Async callback invoked for each message received from a queue subscription.

```typescript
type MessageHandler<T = unknown> = (message: ReceivedMessage<T>) => Promise<void>
```

### Functions

#### `getProvider()`

Retrieves the bonded queue provider, throwing if none is configured.

```typescript
function getProvider(): QueueProvider
```

**Returns:** The bonded queue provider.

#### `hasProvider()`

Checks whether a queue provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a queue provider is bonded.

#### `queue(name)`

Gets or creates a queue handle by name via the bonded provider.

```typescript
function queue(name: string): Queue
```

- `name` — The queue name.

**Returns:** The queue handle for sending, receiving, and subscribing.

#### `receive(queueName, options)`

Receives messages from a named queue via the bonded provider.

```typescript
function receive(queueName: string, options?: ReceiveOptions): Promise<ReceivedMessage<T>[]>
```

- `queueName` — The queue to receive messages from.
- `options` — Receive options such as max messages, visibility timeout, and long-poll wait time.

**Returns:** An array of received messages, each with an `ack()` method for acknowledgement.

#### `send(queueName, message)`

Sends a message to a named queue via the bonded provider.

```typescript
function send(queueName: string, message: QueueMessage<T>): Promise<string>
```

- `queueName` — The target queue name.
- `message` — The message to send, including body and optional attributes.

**Returns:** The message ID assigned by the queue provider.

#### `setProvider(provider)`

Registers a queue provider as the active singleton. Called by bond
packages during application startup.

```typescript
function setProvider(provider: QueueProvider): void
```

- `provider` — The queue provider implementation to bond.

#### `subscribe(queueName, handler, options)`

Subscribes to messages from a named queue. The handler is called for each
incoming message. Returns an unsubscribe function to stop listening.

```typescript
function subscribe(queueName: string, handler: MessageHandler<T>, options?: ReceiveOptions): () => void
```

- `queueName` — The queue to subscribe to.
- `handler` — Async callback invoked for each received message.
- `options` — Receive options such as max messages and visibility timeout.

**Returns:** A function that stops the subscription when called.

## Available Providers

| Provider | Package |
|----------|---------|
| In-memory (no persistence) | `@molecule/api-queue-memory` |
| RabbitMQ | `@molecule/api-queue-rabbitmq` |
| Redis (BullMQ) | `@molecule/api-queue-redis` |
| AWS SQS | `@molecule/api-queue-sqs` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

Delivery is AT-LEAST-ONCE — a message can arrive more than once (retry after a crash, a
redelivery), so:

- **Make handlers IDEMPOTENT.** Running the same job twice must be safe — dedupe on a job id
  or make the effect idempotent (`INSERT … ON CONFLICT DO NOTHING`, a "already sent" check).
  A non-idempotent handler double-charges / double-emails on the second delivery.
- **Never put a secret (or a large blob) in the message `body`.** Payloads are persisted in
  the queue backend — pass an id and load the secret/record server-side in the handler.
- **A throw = retry.** A handler that throws is redelivered (up to the backend's limit), so
  throw on a TRANSIENT error (to retry) but log-and-return on a PERMANENT one (so it doesn't
  retry forever). A job runs OUTSIDE a request (no session), so include the owner id in the
  `body` and re-scope in the handler.

## Translations

Translation strings are provided by `@molecule/api-locales-queue`.
