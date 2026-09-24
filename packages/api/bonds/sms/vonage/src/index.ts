/**
 * Vonage SMS provider for molecule.dev.
 *
 * Implements the `@molecule/api-sms` interface using the Vonage SMS API.
 *
 * Two `SMSOptions` capabilities are NOT supported by the Vonage SMS API —
 * this bond fails fast instead of silently dropping them:
 * - `options.scheduledAt`: `send()` throws ('Vonage SMS API does not support
 *   scheduled sending.') — delay dispatch with a job scheduler instead.
 * - `getStatus()`: always throws — Vonage reports delivery only via DLR
 *   webhooks. Pass `options.callbackUrl` to `send()`/`sendBulk()` and
 *   receive delivery receipts on that endpoint instead of polling.
 *
 * Credentials are captured ONCE when `createProvider()` runs — setting
 * `VONAGE_*` later in the same process has no effect until the provider is
 * re-created (an API restart after filling in secrets does this).
 *
 * @example
 * ```typescript
 * import { send, setProvider } from '@molecule/api-sms'
 * import { createProvider } from '@molecule/api-sms-vonage'
 *
 * // Startup: bond once. Env: VONAGE_API_KEY, VONAGE_API_SECRET, VONAGE_FROM_NUMBER.
 * setProvider(
 *   createProvider({
 *     apiKey: process.env.VONAGE_API_KEY,
 *     apiSecret: process.env.VONAGE_API_SECRET,
 *     defaultFrom: process.env.VONAGE_FROM_NUMBER, // your Vonage number, e.g. '15557654321'
 *   }),
 * )
 *
 * // Vonage numbers are E.164 digits WITHOUT the leading '+'. No polling — delivery
 * // receipts are POSTed to callbackUrl (a route you expose).
 * const result = await send('15551234567', 'Your verification code is 123456', {
 *   callbackUrl: 'https://api.example.com/webhooks/vonage/dlr',
 * })
 * // { id: '<Vonage message-id>', status: 'queued', to: '15551234567' }
 * ```
 *
 * @remarks
 * Importing this package registers `VONAGE_API_KEY` / `VONAGE_API_SECRET` /
 * `VONAGE_FROM_NUMBER` with `@molecule/api-secrets` (mirroring the Twilio
 * bond), so a scaffolded app selecting Vonage gets env-var scaffolding and a
 * boot-time secrets report naming the missing keys.
 *
 * `createProvider()` does NOT validate credentials eagerly — missing
 * `VONAGE_API_KEY`/`VONAGE_API_SECRET` will not throw at bond time.
 * `setProvider(createProvider())` always succeeds; the actionable
 * "apiKey/apiSecret is required" error is thrown on the first actual
 * `send()`/`sendBulk()` call instead, so a scaffolded app that selected
 * Vonage before filling in secrets still boots (SMS just degrades until the
 * secret is set), matching the slack/web-push bonds in this category.
 *
 * **`getStatus()` ALWAYS throws** (the core `getStatus()` too, with this bond) — do not
 * build a status poller on Vonage; pass `options.callbackUrl` and read the DLR webhook.
 * A resolved `send()` means Vonage accepted the message (`status: 'queued'`); a rejected
 * one (e.g. "Non-Whitelisted Destination" on trial accounts) throws with Vonage's
 * `errorText` in the message. `sendBulk()` never rejects — failures are counted in `failed`.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
