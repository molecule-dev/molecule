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
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-webhook'
 * import { createProvider } from '@molecule/api-webhook-queue'
 *
 * // Bond at startup
 * setProvider(createProvider())
 *
 * // Or with custom configuration
 * setProvider(createProvider({
 *   maxRetries: 10,
 *   baseDelay: 2000,
 *   concurrency: 5,
 * }))
 * ```
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './safe-fetch.js'
export * from './types.js'
