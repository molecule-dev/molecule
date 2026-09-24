/**
 * Twilio SMS provider for molecule.dev.
 *
 * Implements the `@molecule/api-sms` interface using the Twilio REST API.
 *
 * `options.scheduledAt` is forwarded as Twilio's `sendAt` + `scheduleType:
 * 'fixed'`, which Twilio only honors for messages sent through a Messaging
 * Service — with a plain `from` phone number (this bond's only sender mode)
 * the API rejects the scheduled send. Treat `scheduledAt` as unsupported
 * here and delay dispatch with a job scheduler instead.
 *
 * Credentials are captured ONCE when `createProvider()` runs — setting
 * `TWILIO_*` later in the same process has no effect until the provider is
 * re-created (an API restart after filling in secrets does this).
 *
 * @example
 * ```typescript
 * import { getStatus, send, setProvider } from '@molecule/api-sms'
 * import { createProvider } from '@molecule/api-sms-twilio'
 *
 * // Startup: bond once. Env: TWILIO_ACCOUNT_SID (AC…), TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER.
 * setProvider(
 *   createProvider({
 *     accountSid: process.env.TWILIO_ACCOUNT_SID,
 *     authToken: process.env.TWILIO_AUTH_TOKEN,
 *     defaultFrom: process.env.TWILIO_FROM_NUMBER, // E.164, e.g. '+15557654321'
 *   }),
 * )
 *
 * // `to` must be E.164 ('+' + country code + number).
 * const result = await send('+15551234567', 'Your verification code is 123456')
 * // { id: 'SM…' (Twilio message SID), status: 'queued', to: '+15551234567' }
 *
 * // Later (or from your status callback), poll delivery:
 * const status = await getStatus(result.id) // { id, status: 'queued' | 'sent' | 'delivered' | 'failed' }
 * ```
 *
 * @remarks
 * `createProvider()` does NOT validate credentials eagerly — missing
 * `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN` will not throw at bond time.
 * `setProvider(createProvider())` always succeeds; the actionable
 * "accountSid/authToken is required" error is thrown on the first actual
 * `send()`/`sendBulk()`/`getStatus()` call instead, so a scaffolded app that
 * selected Twilio before filling in secrets still boots (SMS just degrades
 * until the secret is set), matching the slack/web-push bonds in this
 * category.
 *
 * **A resolved `send()` means Twilio ACCEPTED the message (`status: 'queued'`), not
 * that it was delivered** — poll `getStatus(id)` or pass `options.callbackUrl` (Twilio
 * POSTs status changes there). A trial account can only send to verified numbers.
 * `sendBulk()` sends sequentially and never rejects: per-recipient failures are logged
 * and counted in `failed`.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
