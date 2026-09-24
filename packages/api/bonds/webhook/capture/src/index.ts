/**
 * Webhook capture provider for molecule.dev.
 *
 * Records every `dispatch()` call as an activity event. Intercept-only by
 * default; delegates + tees when wrapping a real provider.
 *
 * @remarks
 * - **Two modes, and the choice decides whether the webhook is DELIVERED.**
 *   INTERCEPT-ONLY (`provider`, or `createWebhookCaptureProvider()` with no
 *   argument) records the dispatch and returns a synthetic 200 — no HTTP
 *   request is made. DELEGATE + TEE
 *   (`createWebhookCaptureProvider(real)`) dispatches through the real provider
 *   AND records the real outcome. Anywhere real deliveries must go out
 *   (production), wrap the real provider — never bond the intercept-only
 *   provider.
 * - Recording is best-effort: a bonded `ActivitySink` that throws NEVER changes
 *   the outcome of `dispatch()` — a successful real dispatch still resolves and
 *   a failed one still rejects with the REAL provider error.
 * - **Requires an activity sink to be useful:** captures go through
 *   `@molecule/api-activity`'s `record()`, which silently no-ops when no
 *   sink is bonded — wire `setSink()` (e.g. the console/database sink) or
 *   intercepted dispatches return synthetic success and leave no trace.
 * - Intercept-only mode returns a synthetic result (`status: 200,
 *   success: true`) with no HTTP delivery; `register()` returns
 *   `secret: ''` when `options.secret` is omitted (NO auto-generation,
 *   unlike the http/queue bonds), registrations are not remembered
 *   (`list()` → `[]`), and every dispatched event is recorded regardless
 *   of registrations.
 * - To capture AND really deliver, wrap a real provider:
 *   `setProvider(createWebhookCaptureProvider(createProvider()))` with
 *   `createProvider` from `@molecule/api-webhook-http`.
 * - Wire it with the core's `setProvider()` from `@molecule/api-webhook` (not
 *   `bond('webhook-capture', ...)`), and the sink with `setSink()` from
 *   `@molecule/api-activity` (not `setProvider`). The recorded event is
 *   `{ type: 'webhook', status: 'captured' | 'sent' | 'failed', recipient: <event name> }`.
 *
 * @example
 * ```typescript
 * import { setSink } from '@molecule/api-activity'
 * import { provider as consoleSink } from '@molecule/api-activity-console'
 * import { dispatch, register, setProvider } from '@molecule/api-webhook'
 * import { provider as captureWebhooks } from '@molecule/api-webhook-capture'
 *
 * // Startup (dev/preview ONLY — intercept-only mode delivers nothing):
 * setSink(consoleSink) // without a sink, captures leave no trace at all
 * setProvider(captureWebhooks)
 *
 * await register('https://hooks.example.com/orders', ['order.created'], { secret: 'whsec-dev' })
 *
 * const results = await dispatch('order.created', { orderId: 'ord_123', total: 4999 })
 * // [{ webhookId: 'captured-…', deliveryId: 'captured-…', status: 200, success: true, duration: 0 }]
 * // …and the sink received { type: 'webhook', status: 'captured', recipient: 'order.created', … }
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
