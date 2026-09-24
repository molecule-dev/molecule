/**
 * HTTP webhook provider for molecule.dev.
 *
 * Implements the `@molecule/api-webhook` interface using direct HTTP POST
 * delivery with HMAC signature verification and automatic retries.
 *
 * @remarks
 * - **All state is in-memory.** Registrations and delivery logs live in the
 *   provider instance and are lost on restart — persist registrations in
 *   your own datastore and re-`register()` at startup. (The queue bond adds
 *   async delivery + backoff, NOT persistence — it is in-memory too.)
 * - **Signature scheme:** each delivery is a JSON POST with
 *   `x-webhook-event: <event>` and `<signatureHeader>` (default
 *   `x-webhook-signature`) set to the hex HMAC-SHA256 of the raw JSON body,
 *   keyed by the registration's secret. Receivers verify by recomputing the
 *   HMAC over the raw request body.
 * - **SSRF is enforced at connect time:** deliveries resolve DNS through a
 *   pinned lookup that refuses private/link-local/metadata addresses (no
 *   validate-then-connect rebinding window). `register()` itself does NOT
 *   validate the URL — a blocked destination surfaces as `status: 0,
 *   success: false` delivery results. Still allowlist at registration time
 *   for a friendly 4xx (see the core's remarks).
 * - `dispatch()` never throws on delivery failure — check each result's
 *   `success` (network errors/timeouts appear as `status: 0`). Retries are
 *   synchronous: `dispatch()` resolves only after all attempts finish.
 * - Receivers MUST dedup on the `x-webhook-delivery-id` header — it is stable across the
 *   retries of one logical delivery (delivery is at-least-once), while the result's
 *   `deliveryId` is per attempt and only for this app's delivery log.
 * - `retryCount` is the number of RETRIES after the first attempt (default 3 → up to 4
 *   POSTs); `timeout` and `retryDelay` are milliseconds. Only 2xx counts as success.
 * - Wire it with the core's `setProvider()` from `@molecule/api-webhook` (not
 *   `bond('webhook-http', ...)`). No env vars or secrets — `register()` generates a random
 *   per-registration `secret` when you omit one; hand it to the receiver.
 *
 * @example
 * ```typescript
 * import { dispatch, register, setProvider } from '@molecule/api-webhook'
 * import { createProvider } from '@molecule/api-webhook-http'
 *
 * // Startup. In-memory registrations: re-register saved subscriptions after every boot.
 * setProvider(createProvider({ timeout: 10_000, retryCount: 3, retryDelay: 2000 })) // ms
 *
 * const hook = await register('https://hooks.partner.example.com/orders', ['order.created'], {
 *   secret: process.env.ORDERS_WEBHOOK_SECRET, // omit → a random secret is generated
 * })
 * // Persist hook.id + hook.secret; the receiver verifies x-webhook-signature with the secret.
 *
 * const results = await dispatch('order.created', { orderId: 'ord_123', total: 4999 })
 * // One result per matching registration — dispatch() never throws on delivery failure:
 * const failed = results.filter((r) => !r.success) // status 0 = network/SSRF-blocked/timeout
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './safe-fetch.js'
export * from './types.js'
