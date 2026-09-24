/**
 * SMS core interface for molecule.dev.
 *
 * Defines the standard interface for SMS messaging providers
 * (Twilio, Vonage, etc.).
 *
 * @module
 * @example
 * ```typescript
 * import { getStatus, send, setProvider } from '@molecule/api-sms'
 * import { createProvider } from '@molecule/api-sms-twilio'
 *
 * // Startup: bond a provider (bonds export createProvider(), not a prebuilt provider).
 * setProvider(
 *   createProvider({
 *     accountSid: process.env.TWILIO_ACCOUNT_SID,
 *     authToken: process.env.TWILIO_AUTH_TOKEN,
 *     defaultFrom: process.env.TWILIO_FROM_NUMBER, // E.164 sender, e.g. '+15551234567'
 *   }),
 * )
 *
 * // Send to an E.164 number (the user's own VERIFIED number — never an arbitrary input).
 * const result = await send('+15557654321', 'Your verification code is 482913')
 * console.log(result.id, result.status) // 'SM…', 'queued'
 *
 * // Poll delivery (Twilio only — Vonage throws; use options.callbackUrl there).
 * const status = await getStatus(result.id)
 * console.log(status.status) // 'queued' | 'sent' | 'delivered' | 'failed'
 * ```
 *
 * @remarks
 * - **Bond first.** Every call throws until `setProvider(...)` runs.
 * - Twilio credentials are NOT validated at bond time — a missing
 *   `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`/`TWILIO_FROM_NUMBER` only throws on the first
 *   `send()`.
 * - `sendBulk()` never throws per recipient — check `result.failed` / each result's `status`.
 *
 * Delivery-status polling (`getStatus()`) is PROVIDER-DEPENDENT, not a
 * universal capability — the Quick Start's `getStatus()` call is not safe to
 * assume for every bonded provider:
 * - `@molecule/api-sms-twilio`: supported — polls the Twilio REST API.
 * - `@molecule/api-sms-vonage`: NOT supported — `getStatus()` always throws
 *   `'Vonage SMS API does not support message status polling.'`. Vonage only
 *   reports delivery via DLR (delivery receipt) webhooks: pass
 *   `options.callbackUrl` to `send()`/`sendBulk()` and receive delivery
 *   updates on that endpoint instead of polling.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Each SMS-triggering flow (phone verification, OTP login, alerts the
 *   app defines) confirms the send in the UI and a message actually reaches
 *   the transport. The sandbox CAPTURES outbound SMS instead of sending — read
 *   it with the `read_activity` tool (filter type 'sms'); the code/link is in
 *   its payload. Never mock the flow or modify production code to expose it.
 * - [ ] The OTP round-trip completes: request a code → read the captured
 *   message's code → enter it in the UI → the flow advances; a wrong or
 *   expired code is rejected with a visible error.
 * - [ ] Messages go only to the authenticated user's own verified number — no
 *   UI or endpoint lets a caller text an arbitrary number (spam/abuse vector).
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './sms.js'
export * from './types.js'
