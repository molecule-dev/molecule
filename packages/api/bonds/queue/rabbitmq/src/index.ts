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
 * - **`delaySeconds` requires the RabbitMQ `rabbitmq-delayed-message-exchange`
 *   plugin AND publishing through a delayed exchange.** This bond publishes to
 *   the default exchange, where the `x-delay` header has NO effect — without
 *   that plugin/topology a "delayed" message is delivered immediately. Use the
 *   Redis, SQS, or memory bond if native delayed delivery matters.
 * - `receive()` is pull-based (`channel.get`); `ReceiveOptions.waitTimeSeconds`
 *   and `visibilityTimeout` are not supported by AMQP semantics — unacked
 *   messages return to the queue when the channel/connection closes, not on a
 *   timer.
 *
 * @see https://www.npmjs.com/package/amqplib
 *
 * @module
 */

export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
