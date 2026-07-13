/**
 * Twilio SMS provider for molecule.dev.
 *
 * Implements the `@molecule/api-sms` interface using the Twilio REST API.
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

export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
