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
 */

export * from './provider.js'
export * from './types.js'
