# @molecule/api-queue

Queue/messaging core interface for molecule.dev.

Defines the standard interface for queue providers.

## Quick Start

```ts
import { send, subscribe } from '@molecule/api-queue'

await send('emails', { body: { userId, kind: 'welcome' } }) // an id, not the email body/secret

subscribe<{ userId: string; kind: string }>('emails', async (msg) => {
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
npm install @molecule/api-queue @molecule/api-bond @molecule/api-i18n
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

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-i18n`

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
- **Returning normally from a `subscribe` handler ACKS the message** on every bond — explicit
  `ack()` is only needed in pull-style `receive()` flows (and calling it in a subscriber is a
  safe no-op). `nack()` rejects the message for redelivery.

**`QueueMessage.delaySeconds` support by bond** — every bond either honors it for real or
throws/documents an explicit alternative; NONE silently no-op it:

| Bond | Mechanism | Notes |
|------|-----------|-------|
| `@molecule/api-queue-memory` | Native (`visibleAt` timestamp) | No cap. |
| `@molecule/api-queue-redis` (BullMQ) | Native (`delay` job option) | No cap. |
| `@molecule/api-queue-sqs` | Native (`DelaySeconds`) | Capped at 900s (15 min) by SQS itself. |
| `@molecule/api-queue-rabbitmq` | Per-delay "wait" queue (`x-message-ttl` + dead-letter back to the real queue) | Real delayed delivery with **no** `rabbitmq-delayed-message-exchange` plugin required — the bond creates one durable queue per distinct delay value used. |

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

## Translations

Translation strings are provided by `@molecule/api-locales-queue`.
