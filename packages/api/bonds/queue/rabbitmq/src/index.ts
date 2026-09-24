/**
 * RabbitMQ queue provider for molecule.dev.
 *
 * Connects via `RABBITMQ_URL` (or `RABBITMQ_HOST`/`PORT`/`USER`/`PASSWORD`/`VHOST`,
 * defaulting to `amqp://guest:guest@localhost:5672/`). The default `provider`
 * export connects lazily on first use; queues are asserted durable on demand.
 *
 * @example
 * ```typescript
 * import { send, setProvider, subscribe } from '@molecule/api-queue'
 * import { createProvider } from '@molecule/api-queue-rabbitmq'
 *
 * // Startup. Env: RABBITMQ_URL (e.g. amqps://rabbit.example.com:5671/app). The first
 * // connection attempt REJECTS on a bad URL / unreachable broker — boot fails fast.
 * const rabbit = await createProvider({ url: process.env.RABBITMQ_URL, prefetch: 10 })
 * setProvider(rabbit)
 *
 * // A handler throw requeues ONCE, then dead-letters — with no DLQ the message is DROPPED.
 * await rabbit.createQueue?.('emails.dead')
 * await rabbit.createQueue?.('emails', { deadLetterQueue: { name: 'emails.dead', maxReceiveCount: 2 } })
 *
 * interface WelcomeEmailJob {
 *   to: string
 *   name: string
 * }
 * const greeted: string[] = []
 * const unsubscribe = subscribe<WelcomeEmailJob>('emails', async (message) => {
 *   greeted.push(`Welcome, ${message.body.name} <${message.body.to}>`) // returning = ack
 * })
 *
 * await send<WelcomeEmailJob>('emails', { body: { to: 'ada@example.com', name: 'Ada' } })
 * await send<WelcomeEmailJob>('emails', {
 *   body: { to: 'grace@example.com', name: 'Grace' },
 *   delaySeconds: 60, // SECONDS; parked on the `emails.delay.60000` wait queue
 * })
 *
 * process.on('SIGTERM', () => {
 *   unsubscribe()
 *   void rabbit.close?.()
 * })
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
 *   DROPPED. Configure a dead-letter queue for anything you cannot afford to lose,
 *   and create the dead-letter queue itself first (the broker drops messages routed to
 *   a queue that does not exist). `deadLetterQueue.maxReceiveCount` is IGNORED here —
 *   it is always one requeue.
 * - **Use `createProvider()` (async) or the lazy `provider` export** — the lazy one
 *   connects on first use, so a bad `RABBITMQ_URL` surfaces at the first `send()`, not
 *   at boot. With neither `RABBITMQ_URL` nor `RABBITMQ_HOST` it dials
 *   `amqp://guest:guest@localhost:5672/`. `createQueue`/`close` are optional on the
 *   core `QueueProvider` type, hence `rabbit.createQueue?.(...)`.
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
