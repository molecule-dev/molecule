/**
 * SMS capture provider for molecule.dev.
 *
 * Records every `send()` / `sendBulk()` call as an activity event.
 * Intercept-only by default; delegates + tees when wrapping a real provider.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-sms'
 * import { provider } from '@molecule/api-sms-capture'
 *
 * setProvider(provider) // intercept-only: nothing is actually sent
 *
 * // Tee mode: really send AND record the real outcome
 * // import { createSMSCaptureProvider } from '@molecule/api-sms-capture'
 * // import { createProvider as twilio } from '@molecule/api-sms-twilio'
 * // setProvider(createSMSCaptureProvider(twilio()))
 * ```
 *
 * @remarks
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
