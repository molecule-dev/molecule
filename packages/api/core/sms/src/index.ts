/**
 * SMS core interface for molecule.dev.
 *
 * Defines the standard interface for SMS messaging providers
 * (Twilio, Vonage, etc.).
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider, send, getStatus } from '@molecule/api-sms'
 *
 * // Bond a provider at startup
 * setProvider(twilioProvider)
 *
 * // Send a message
 * const result = await send('+1234567890', 'Hello from Molecule!')
 *
 * // Check delivery status
 * const status = await getStatus(result.id)
 * console.log(status.status) // 'delivered'
 * ```
 *
 * @remarks
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
