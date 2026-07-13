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
 *   effect and a concurrently running `subscribe()` worker can process a job
 *   you are holding. Prefer `subscribe()` for real consumption; use
 *   `receive()` + `ack()` only in single-consumer flows.
 * - **`QueueMessage.attributes`, `groupId`, and `deduplicationId` are not
 *   persisted** by this bond (BullMQ has no message-attribute concept).
 *   Deduplicate by passing a stable `message.id` — BullMQ ignores a second
 *   job with the same job id. Put data the handler needs in `body`.
 * - Providing a `message.id` that was ever used before (even for a completed
 *   job that has not been cleaned up) makes the send a silent no-op — ids
 *   must be unique per logical job, e.g. `` `welcome-${userId}` ``.
 *
 * @see https://docs.bullmq.io/
 *
 * @module
 */

export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
