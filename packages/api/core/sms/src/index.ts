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
 */

export * from './provider.js'
export * from './sms.js'
export * from './types.js'
