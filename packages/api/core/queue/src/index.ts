/**
 * Queue/messaging core interface for molecule.dev.
 *
 * Defines the standard interface for queue providers.
 *
 * @remarks
 * Delivery is AT-LEAST-ONCE — a message can arrive more than once (retry after a crash, a
 * redelivery), so:
 *
 * - **Make handlers IDEMPOTENT.** Running the same job twice must be safe — dedupe on a job id
 *   or make the effect idempotent (`INSERT … ON CONFLICT DO NOTHING`, a "already sent" check).
 *   A non-idempotent handler double-charges / double-emails on the second delivery.
 * - **Never put a secret (or a large blob) in the message `body`.** Payloads are persisted in
 *   the queue backend — pass an id and load the secret/record server-side in the handler.
 * - **A throw = retry.** A handler that throws is redelivered (up to the backend's limit), so
 *   throw on a TRANSIENT error (to retry) but log-and-return on a PERMANENT one (so it doesn't
 *   retry forever). A job runs OUTSIDE a request (no session), so include the owner id in the
 *   `body` and re-scope in the handler.
 * - **Returning normally from a `subscribe` handler ACKS the message** on every bond — explicit
 *   `ack()` is only needed in pull-style `receive()` flows (and calling it in a subscriber is a
 *   safe no-op). `nack()` rejects the message for redelivery.
 *
 * **`QueueMessage.delaySeconds` support by bond** — every bond either honors it for real or
 * throws/documents an explicit alternative; NONE silently no-op it:
 *
 * | Bond | Mechanism | Notes |
 * |------|-----------|-------|
 * | `@molecule/api-queue-memory` | Native (`visibleAt` timestamp) | No cap. |
 * | `@molecule/api-queue-redis` (BullMQ) | Native (`delay` job option) | No cap. |
 * | `@molecule/api-queue-sqs` | Native (`DelaySeconds`) | Capped at 900s (15 min) by SQS itself. |
 * | `@molecule/api-queue-rabbitmq` | Per-delay "wait" queue (`x-message-ttl` + dead-letter back to the real queue) | Real delayed delivery with **no** `rabbitmq-delayed-message-exchange` plugin required — the bond creates one durable queue per distinct delay value used. |
 *
 * @example
 * ```ts
 * import { send, subscribe } from '@molecule/api-queue'
 *
 * await send('emails', { body: { userId, kind: 'welcome' } }) // an id, not the email body/secret
 *
 * subscribe<{ userId: string; kind: string }>('emails', async (msg) => {
 *   const user = await findById('users', msg.body.userId) // re-load server-side; re-scope
 *   if (user?.welcomeSentAt) return // idempotent — already done, skip the redelivery
 *   await sendMail({ from, to: user.email, subject: 'Welcome' })
 *   await updateById('users', user.id, { welcomeSentAt: Date.now() })
 * })
 * ```
 *
 * @module
 */

// Type exports
export * from './types.js'

// Provider exports
export * from './provider.js'
