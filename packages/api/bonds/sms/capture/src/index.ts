/**
 * SMS capture provider for molecule.dev.
 *
 * Records every `send()` / `sendBulk()` call as an activity event.
 * Intercept-only by default; delegates + tees when wrapping a real provider.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-sms'
 * import { provider } from '@molecule/api-sms-capture'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
