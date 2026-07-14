/**
 * Vonage SMS provider for molecule.dev.
 *
 * Implements the `@molecule/api-sms` interface using the Vonage SMS API.
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-sms'
 * import { createProvider } from '@molecule/api-sms-vonage'
 *
 * // Bond at startup (reads VONAGE_* env vars by default)
 * setProvider(createProvider())
 *
 * // Or with explicit config
 * setProvider(createProvider({
 *   apiKey: 'abc123',
 *   apiSecret: 'secret',
 *   defaultFrom: '+15551234567',
 * }))
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
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
