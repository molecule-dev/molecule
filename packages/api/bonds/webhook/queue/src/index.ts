/**
 * Queue-backed webhook provider for molecule.dev.
 *
 * Implements the `@molecule/api-webhook` interface using an internal job queue
 * with exponential backoff retries and configurable concurrency.
 *
 * @remarks
 * - **`dispatch()` is fire-and-forget:** it enqueues and immediately returns
 *   synthetic per-registration results (`status: 202, success: true`) —
 *   `success` means ACCEPTED for delivery, not delivered. Real outcomes land
 *   asynchronously; poll `getDeliveryLog(webhookId)` for final statuses.
 * - **All state is in-memory** — registrations, delivery logs, and the job
 *   queue itself. A restart loses registrations AND any pending/in-flight
 *   deliveries; this bond adds async delivery + backoff over the http bond,
 *   not durability. Persist registrations yourself and re-register at boot.
 * - `WebhookOptions.retryCount` is currently IGNORED — retries always use
 *   the provider-level `maxRetries` (default 5) with exponential backoff
 *   between `baseDelay` and `maxDelay`.
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
