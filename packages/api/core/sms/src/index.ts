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
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './sms.js'
export * from './types.js'
