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
 */

export * from './provider.js'
export * from './types.js'
