/**
 * In-memory queue provider for molecule.dev.
 *
 * A zero-dependency, zero-configuration, in-process queue provider for
 * development and testing — no broker, no credentials, no environment
 * variables. Implements the full `@molecule/api-queue` contract with
 * SQS-style semantics: named queues, at-least-once delivery via visibility
 * leases, delayed messages (`delaySeconds`), redelivery on subscriber
 * handler failure or `nack()`, a bounded delivery cap with optional
 * dead-letter routing, FIFO group ordering + deduplication, long-polling
 * `receive()`, and `maxMessages`-bounded subscriber concurrency.
 *
 * @example
 * ```typescript
 * import { setProvider, queue } from '@molecule/api-queue'
 * import { provider } from '@molecule/api-queue-memory'
 *
 * setProvider(provider) // no configuration, no env vars
 *
 * const emails = queue('emails')
 * const unsubscribe = emails.subscribe(async (message) => {
 *   await deliver(message.body)
 *   await message.ack() // handler success also auto-acks
 * })
 *
 * await emails.send({ body: { to: 'a@b.c' } })
 * await emails.send({ body: { to: 'later@b.c' }, delaySeconds: 60 })
 * ```
 *
 * @remarks
 * Single-process and DEV-ONLY. Messages live in this process's memory: there
 * is NO persistence (everything is lost on restart) and NO cross-instance
 * delivery, so it must not be used for multi-instance production — swap in
 * `@molecule/api-queue-redis`, `@molecule/api-queue-rabbitmq`, or
 * `@molecule/api-queue-sqs` for production workloads. Delivery is
 * at-least-once: a message whose visibility lease expires without `ack()` is
 * redelivered (with an incremented `receiveCount`), and a message delivered
 * more than `maxReceiveCount` times (default 3) is routed to the queue's
 * dead-letter queue when one was configured via `createQueue()` — otherwise
 * it is dropped with an error log. Message bodies are `structuredClone`d on
 * send and per delivery (like a real broker's serialization), so bodies must
 * be structured-cloneable and post-send mutations never leak to consumers.
 * `QueueCreateOptions.maxMessageSize` is not enforced (nothing is
 * serialized). `close()` clears all timers, resolves pending long-polls with
 * `[]`, and stops all delivery.
 *
 * Two distinct redelivery delays (both `MemoryQueueOptions`, provider-wide):
 * an explicit `nack()` redelivers per `redeliveryDelaySeconds` (default `0`
 * — a deliberate caller decision, honored immediately), while an UNCAUGHT
 * `subscribe()` handler throw redelivers per
 * `handlerFailureRedeliveryDelaySeconds` (default `1` — an unplanned failure
 * gets a real retry window instead of burning all `maxReceiveCount` attempts
 * within milliseconds, mirroring the Redis bond's `attempts: 3, backoff:
 * { type: 'exponential', delay: 1000 }`).
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
