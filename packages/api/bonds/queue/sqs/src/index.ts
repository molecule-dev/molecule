/**
 * AWS SQS queue provider for molecule.dev.
 *
 * Uses `AWS_REGION` (default `us-east-1`) with the standard AWS credential
 * chain; set `SQS_ENDPOINT` to target LocalStack. Queue URLs are resolved
 * lazily on first operation — the queue must already exist (create it with
 * `createQueue()` or in AWS) or the first send/receive rejects with the AWS
 * `QueueDoesNotExist` error. Pass `{ autoCreateQueues: true }` to
 * `createProvider()` to auto-create a standard queue on first use instead
 * (opt-in — unlike the memory/redis bonds, silently creating AWS resources
 * has cost/IAM implications, so it is never the default).
 *
 * @example
 * ```typescript
 * import { setProvider, send, subscribe } from '@molecule/api-queue'
 * import { provider } from '@molecule/api-queue-sqs'
 *
 * setProvider(provider)
 *
 * subscribe<{ userId: string }>('emails', async (message) => {
 *   await deliver(message.body) // returning normally acks (deletes) the message
 * })
 *
 * await send('emails', { body: { userId: 'u1' } })
 * ```
 *
 * @remarks
 * Delivery semantics (at-least-once — handlers must be idempotent):
 *
 * - **Handler success acks (deletes) automatically**; a handler throw leaves
 *   the message leased, and it returns to the queue when the visibility
 *   timeout expires (throw = retry). Bound poison messages with a redrive
 *   policy: `createQueue(name, { deadLetterQueue: { name, maxReceiveCount } })`.
 * - `ack()`/`nack()` settle at most once; `nack()` returns the message to the
 *   queue immediately (visibility timeout 0) instead of waiting out the lease.
 * - FIFO queues need the `.fifo` suffix (`createQueue(name, { fifo: true })`
 *   appends it) and a `groupId` per message; a `deduplicationId` is derived
 *   from the message id when not provided.
 * - `delaySeconds` is capped at 900 (15 minutes) by SQS itself.
 * - `subscribe()` retries a failed queue-URL resolution (bad region,
 *   credentials not yet propagated, a `QueueDoesNotExist` race) with bounded
 *   exponential backoff (1s → 30s) instead of logging once and leaving the
 *   subscription permanently dead — it self-heals once the queue/credentials
 *   become valid.
 *
 * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sqs/
 *
 * @module
 */

export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
