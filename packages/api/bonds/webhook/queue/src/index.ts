/**
 * Queue-backed webhook provider for molecule.dev.
 *
 * Implements the `@molecule/api-webhook` interface using an internal job queue
 * with exponential backoff retries and configurable concurrency.
 *
 * @remarks
 * - **`dispatch()` returns an ACCEPTANCE receipt, NOT a delivery result.** It
 *   enqueues one job per matching registration and immediately returns
 *   `{ status: 202, success: true, deliveryId }` per registration: `202` means
 *   QUEUED (accepted for async delivery), NOT delivered, and `success` means
 *   "successfully enqueued" — neither claims the receiver was reached. The real
 *   per-delivery outcome (the receiver's 2xx/failure) is recorded asynchronously;
 *   poll `getDeliveryLog(webhookId)` and match on the returned `deliveryId` for
 *   the final status. A delivery that later FAILS is recorded as `success: false`
 *   in the log and is never reported as a success. (Need the delivery outcome
 *   synchronously? Use `@molecule/api-webhook-http`, which delivers inline and
 *   returns the real result.)
 * - **`WebhookOptions.retryCount` is HONORED, per registration.** Each webhook
 *   retries up to its own `retryCount` on failure (captured at register time;
 *   defaults to the provider-level `maxRetries`, default 5) with exponential
 *   backoff between `baseDelay` and `maxDelay`. The provider `maxRetries` is only
 *   the default for registrations that omit `retryCount`.
 * - **All state is in-memory — NOT durable.** registrations, delivery logs, and
 *   the job queue itself are plain in-memory structures. A restart LOSES
 *   registrations AND any pending/in-flight deliveries; this bond adds async
 *   delivery + backoff over the http bond, not durability. Do NOT build a
 *   delivery-reliability guarantee on it — persist registrations yourself and
 *   re-register at boot, and back it with a durable queue/store if you need
 *   at-least-once delivery across restarts.
 * - Same delivery format and connect-time SSRF guard as
 *   `@molecule/api-webhook-http`: JSON POST with `x-webhook-event` +
 *   hex HMAC-SHA256 of the body in `x-webhook-signature` (configurable),
 *   private/metadata destinations refused at connect (failed deliveries in
 *   the log, never a throw).
 * - **Unlike the http bond, it sends NO `x-webhook-delivery-id` header** — receivers
 *   cannot dedup retried deliveries by id; make receiver handlers idempotent on your own
 *   payload id (e.g. `orderId`).
 * - Wire it with the core's `setProvider()` from `@molecule/api-webhook` (not
 *   `bond('webhook-queue', ...)`). No env vars; `baseDelay`/`maxDelay`/`timeout` are
 *   milliseconds. `getDeliveryLog()` has NO entry for a delivery until its final attempt
 *   finishes (it stays `undefined` while queued or retrying).
 *
 * @example
 * ```typescript
 * import { dispatch, getDeliveryLog, register, setProvider } from '@molecule/api-webhook'
 * import { createProvider } from '@molecule/api-webhook-queue'
 *
 * // Startup. In-memory queue + registrations: re-register saved subscriptions after every boot.
 * setProvider(createProvider({ maxRetries: 5, baseDelay: 1000, maxDelay: 60_000, concurrency: 10 }))
 *
 * const hook = await register('https://hooks.partner.example.com/orders', ['order.created'], {
 *   secret: process.env.ORDERS_WEBHOOK_SECRET, // omit → a random secret is generated
 * })
 *
 * const [receipt] = await dispatch('order.created', { orderId: 'ord_123', total: 4999 })
 * // receipt: { webhookId: hook.id, deliveryId, status: 202, success: true } — QUEUED, not delivered
 *
 * // Later (e.g. an admin "deliveries" view): the REAL outcome, once the final attempt ran.
 * const log = await getDeliveryLog(hook.id)
 * const outcome = log.find((delivery) => delivery.id === receipt?.deliveryId)
 * // outcome?.success / outcome?.status → the receiver's response; undefined while pending
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './safe-fetch.js'
export * from './types.js'
