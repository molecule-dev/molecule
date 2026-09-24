/**
 * SMS capture provider for molecule.dev.
 *
 * Records every `send()` / `sendBulk()` call as an activity event.
 * Intercept-only by default; delegates + tees when wrapping a real provider.
 *
 * @example
 * ```typescript
 * import { setSink } from '@molecule/api-activity'
 * import { provider as consoleSink } from '@molecule/api-activity-console'
 * import { send, setProvider } from '@molecule/api-sms'
 * import { provider as smsCapture } from '@molecule/api-sms-capture'
 *
 * // Startup (dev/sandbox): bond an activity sink FIRST, or captures are visible nowhere.
 * setSink(consoleSink)
 * setProvider(smsCapture) // intercept-only: nothing reaches a handset
 * // Production instead — really send AND record the outcome (tee mode):
 * //   setProvider(createSMSCaptureProvider(twilio())) // twilio = createProvider from '@molecule/api-sms-twilio'
 *
 * const result = await send('+15551234567', 'Your verification code is 123456')
 * // { id: 'captured-<uuid>', status: 'sent', to: '+15551234567' }
 * // logger.info: '[activity] sms captured → +15551234567: Your verification code is 123456'
 * ```
 *
 * @remarks
 * - **Two modes, and the choice decides whether the message is DELIVERED.**
 *   INTERCEPT-ONLY (`provider`, or `createSMSCaptureProvider()` with no
 *   argument) records the message and returns a synthetic success — nothing
 *   reaches the handset. DELEGATE + TEE (`createSMSCaptureProvider(real)`)
 *   sends through the real provider AND records the real outcome. Anywhere
 *   real messages must go out (production), wrap the real provider — never
 *   bond the intercept-only provider.
 * - Recording is best-effort: a bonded `ActivitySink` that throws NEVER changes
 *   the outcome of `send()` — a successful real send still resolves and a
 *   failed one still rejects with the REAL provider error.
 * - **Captured messages go to the bonded ACTIVITY SINK** (`@molecule/api-activity`
 *   — e.g. the sandbox's sink read by the `read_activity` tool). **Without a sink
 *   bonded, `record()` is a silent no-op**: intercept-only `send()` still returns a
 *   synthetic success and the message is visible nowhere. Wire an activity sink
 *   before relying on captures (OTP flows, the E2E checklist).
 * - Intercept-only mode returns synthetic results: `send()` → `status: 'sent'` with
 *   id `captured-<uuid>`, and `getStatus()` ALWAYS reports `'sent'`. In tee mode both
 *   reflect the wrapped real provider (whose `getStatus()` support varies — see
 *   `@molecule/api-sms`).
 * - Events record `status: 'captured'` when intercepting, `'sent'`/`'failed'` when
 *   teeing a real provider — so the activity feed never shows a delivery that didn't
 *   happen.
 *
 * @module
 */
export * from './browser-guard.js'
export * from './provider.js'
