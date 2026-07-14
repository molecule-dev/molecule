/**
 * RabbitMQ queue provider for molecule.dev.
 *
 * Connects via `RABBITMQ_URL` (or `RABBITMQ_HOST`/`PORT`/`USER`/`PASSWORD`/`VHOST`,
 * defaulting to `amqp://guest:guest@localhost:5672/`). The default `provider`
 * export connects lazily on first use; queues are asserted durable on demand.
 *
 * @example
 * ```typescript
 * import { setProvider, send, subscribe } from '@molecule/api-queue'
 * import { provider } from '@molecule/api-queue-rabbitmq'
 *
 * setProvider(provider) // connects on first operation using RABBITMQ_* env vars
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
 * - **Handler success acks automatically**; explicit `ack()`/`nack()` are only
 *   needed to settle early, and are idempotent (a second settlement of the same
 *   delivery is a safe no-op — a raw double-ack would close the AMQP channel).
 * - **A handler throw = one immediate requeue.** A message that fails again
 *   after redelivery is routed to the queue's dead-letter exchange when one was
 *   configured (`createQueue(name, { deadLetterQueue })`) — otherwise it is
 *   DROPPED. Configure a dead-letter queue for anything you cannot afford to lose.
 * - **`delaySeconds` works out of the box — no `rabbitmq-delayed-message-exchange`
 *   plugin required.** A message with `delaySeconds` is parked on a
 *   per-delay wait queue (named `<queue>.delay.<ms>`, created on demand)
 *   whose `x-message-ttl` equals the delay; once the TTL expires the broker
 *   dead-letters it back to the real queue via the default exchange. Every
 *   distinct delay value gets its own wait queue, so mixed delays on the
 *   same logical queue never hit RabbitMQ's "TTL only expires at the head"
 *   staggering gotcha. The wait queues are an implementation detail — do
 *   not publish to them directly, and expect one extra durable queue per
 *   distinct `delaySeconds` value your app actually uses.
 * - **A connection drop or a channel-killing broker error auto-recovers**
 *   with bounded exponential backoff (1s → 30s), and every active
 *   `subscribe()` consumer is re-attached once reconnected — a transient
 *   broker restart no longer permanently breaks every queue for the life of
 *   the process. The very FIRST connection attempt (inside `createProvider`)
 *   still fails fast (rejects) so a bad `RABBITMQ_URL` is caught immediately
 *   at boot instead of retrying silently forever.
 * - `receive()` is pull-based (`channel.get`); `ReceiveOptions.waitTimeSeconds`
 *   and `visibilityTimeout` are not supported by AMQP semantics — unacked
 *   messages return to the queue when the channel/connection closes, not on a
 *   timer.
 *
 * @see https://www.npmjs.com/package/amqplib
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
