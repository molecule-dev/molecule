/**
 * Redis/BullMQ queue provider for molecule.dev.
 *
 * Connects via `REDIS_URL` (or `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`,
 * defaulting to `localhost:6379`). Queues are created implicitly on first
 * access; keys are prefixed with `molecule:queue:` by default.
 *
 * @example
 * ```typescript
 * import { setProvider, send, subscribe } from '@molecule/api-queue'
 * import { provider } from '@molecule/api-queue-redis'
 *
 * setProvider(provider) // connects lazily using REDIS_* env vars
 *
 * subscribe<{ userId: string }>('emails', async (message) => {
 *   await deliver(message.body) // returning normally acks the message
 * })
 *
 * await send('emails', { body: { userId: 'u1' } })
 * ```
 *
 * @remarks
 * Delivery semantics (at-least-once — handlers must be idempotent):
 *
 * - **Handler success acks automatically** (the BullMQ processor completing IS
 *   the ack); a handler throw or `nack()` fails the job and BullMQ retries it
 *   up to 3 attempts with exponential backoff (1s base), after which it stays
 *   in the failed set (inspectable — not silently dropped).
 * - **`receive()` is a PEEK, not a lease**: it returns jobs from the waiting
 *   list without locking them, so `ReceiveOptions.visibilityTimeout` has no
 *   effect (a warning is logged if you pass it) and a concurrently running
 *   `subscribe()` worker can process a job you are holding. Prefer
 *   `subscribe()` for real consumption; use `receive()` + `ack()` only in
 *   single-consumer flows.
 * - **`QueueMessage.attributes` round-trip through `receive()`/`subscribe()`**
 *   (persisted in a small versioned envelope inside `job.data`) — the
 *   received `attributes` are your own data, never BullMQ's internal
 *   `job.opts` (retry/backoff settings). A job already in Redis from before
 *   this envelope existed decodes as a plain body with `attributes:
 *   undefined`, so upgrading is safe with jobs in flight.
 * - **`deduplicationId` maps onto BullMQ's native job-id dedup**: when set
 *   without an explicit `message.id`, it becomes the BullMQ job id, so a
 *   second `send()` with the same `deduplicationId` is a no-op — the closest
 *   real equivalent to SQS FIFO deduplication this backend has. `groupId`
 *   has no effect (BullMQ has no FIFO-group/ordering concept).
 * - Providing a `message.id` (or `deduplicationId`) that was ever used before
 *   (even for a completed job that has not been cleaned up) makes the send a
 *   silent no-op — ids must be unique per logical job, e.g.
 *   `` `welcome-${userId}` ``.
 * - **Redis being unreachable fails fast for producer calls** (`send`,
 *   `sendBatch`, `receive`, `size`, `purge`, `deleteQueue`) instead of
 *   hanging forever on ioredis's default offline command buffer — the
 *   rejection names `REDIS_URL`/`REDIS_HOST` so the failure is actionable.
 *   The `subscribe()` worker connection intentionally keeps retrying
 *   indefinitely in the background (appropriate for a long-running
 *   consumer) — BullMQ requires this for its blocking connection regardless.
 *
 * @see https://docs.bullmq.io/
 *
 * @module
 */

export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
