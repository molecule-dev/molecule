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
 * @module
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-sms'
 * import { createProvider } from '@molecule/api-sms-twilio'
 *
 * // Bond at startup (reads TWILIO_* env vars by default)
 * setProvider(createProvider())
 *
 * // Or with explicit config
 * setProvider(createProvider({
 *   accountSid: 'AC...',
 *   authToken: 'xxx',
 *   defaultFrom: '+15551234567',
 * }))
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
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
