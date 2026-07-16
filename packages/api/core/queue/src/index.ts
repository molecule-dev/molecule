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
 * @e2e
 * Integration checklist — exercise the REAL behavior end-to-end (drive the app
 * action that enqueues/consumes work in the live preview, no mocks), adapt each
 * item to this app's actual screens/flows, and check every box off one by one. A
 * box you can't check is an integration bug to fix — not a skip:
 * - [ ] The action that enqueues work responds fast — `send()` returns a message
 *   id immediately and the request/response does NOT block on the job. The #1
 *   trap: the executor awaits the heavy work inline (defeating the queue);
 *   confirm the triggering UI action returns quickly and the work happens in the
 *   background.
 * - [ ] The enqueued job actually RUNS — a `subscribe()` consumer (a
 *   `MessageHandler`) is wired and running, so the message's real side effect
 *   (email sent, file processed, notification delivered — whatever the app does)
 *   actually appears in the UI/data. A message enqueued with no worker wired is
 *   the silent failure.
 * - [ ] Payload round-trips intact — the `ReceivedMessage.body` the handler sees
 *   equals the `QueueMessage.body` that was sent, with no dropped or renamed
 *   fields.
 * - [ ] Failure is handled — a handler that throws is redelivered (up to
 *   `QueueCreateOptions.deadLetterQueue.maxReceiveCount`, tracked via
 *   `receiveCount`) or dead-lettered, never silently lost. Delivery is
 *   at-least-once, so the handler is idempotent (dedupe on the job/record id) — a
 *   redelivery must not double-charge or double-send.
 * - [ ] Ordering/concurrency is not assumed — the app does not rely on strict
 *   FIFO (`QueueMessage.groupId`/`fifo`) or exactly-once delivery unless the
 *   bonded provider actually guarantees it.
 * - [ ] Least-authority payloads — the `body` carries only the ids/refs the job
 *   needs (never a secret or stale authority); the consumer re-loads and
 *   re-scopes on the CURRENT data (owner id from `body`, re-checked server-side)
 *   so one user's job cannot act on another user's resource.
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
