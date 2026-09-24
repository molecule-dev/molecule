/**
 * Push notification capture provider for molecule.dev.
 *
 * Records every `send()` / `sendMany()` call as an activity event.
 * Intercept-only by default; delegates + tees when wrapping a real provider.
 *
 * @example
 * ```typescript
 * import type { ActivityEvent } from '@molecule/api-activity'
 * import { setSink } from '@molecule/api-activity'
 * import { createPushCaptureProvider } from '@molecule/api-push-capture'
 * import { send, setProvider } from '@molecule/api-push-notifications'
 *
 * // Startup (dev / preview): an activity sink to receive the captured events, then the
 * // INTERCEPT-ONLY capture provider. Nothing is delivered to the subscriber.
 * // (Production: `createPushCaptureProvider(realProvider)` delivers AND records.)
 * const captured: ActivityEvent[] = []
 * setSink({ record: async (event) => void captured.push(event) })
 * setProvider(createPushCaptureProvider())
 *
 * const result = await send(
 *   { endpoint: 'https://push.example.com/sub/abc', keys: { p256dh: 'p256dh-key', auth: 'auth-key' } },
 *   { title: 'Order shipped', options: { body: 'Your order is on the way' } },
 * )
 * // result.statusCode === 201 (synthetic)
 * // captured[0] → { type: 'push', status: 'captured', recipient: 'https://push.example.com/sub/abc',
 * //                 summary: 'Order shipped', ... }
 * ```
 *
 * @remarks
 * - **Two modes, and the choice decides whether the notification is
 *   DELIVERED.** INTERCEPT-ONLY (`provider`, or `createPushCaptureProvider()`
 *   with no argument) records the notification and returns a synthetic 201 —
 *   nothing reaches the subscriber. DELEGATE + TEE
 *   (`createPushCaptureProvider(real)`) delivers through the real provider AND
 *   records the real outcome. Anywhere real notifications must go out
 *   (production), wrap the real provider — never bond the intercept-only
 *   provider.
 * - **Bond an activity sink** (`setSink(...)` from `@molecule/api-activity`, e.g.
 *   `@molecule/api-activity-console`) — with no sink, `record()` silently no-ops and the
 *   intercepted notification leaves no trace at all.
 * - Recording is best-effort: a bonded `ActivitySink` that throws NEVER changes
 *   the outcome of `send()` — a successful real send still resolves and a
 *   failed one still rejects with the REAL provider error.
 *
 * In intercept-only mode (no `realProvider`), `generateVapidKeys()` THROWS —
 * there is no real push transport behind it to generate real keys with.
 * Wrap a real provider (`createPushCaptureProvider(realProvider)`) to
 * delegate key generation, or generate VAPID keys once with a real provider
 * (e.g. `@molecule/api-push-notifications-web-push`'s `generateVapidKeys()`)
 * and set `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`. `getPublicKey()` is
 * unaffected — it honestly falls back to the `VAPID_PUBLIC_KEY` env var so
 * the enable-push UI keeps working in capture mode even though sends stay
 * captured.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
