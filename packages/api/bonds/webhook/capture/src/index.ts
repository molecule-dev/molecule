/**
 * Webhook capture provider for molecule.dev.
 *
 * Records every `dispatch()` call as an activity event. Intercept-only by
 * default; delegates + tees when wrapping a real provider.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-webhook'
 * import { provider } from '@molecule/api-webhook-capture'
 *
 * setProvider(provider)
 * ```
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
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
