/**
 * Channel capture provider for molecule.dev.
 *
 * Records every `sendMessage()` call as an activity event. Intercept-only by
 * default; delegates + tees when wrapping a real provider.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-channel'
 * import { provider } from '@molecule/api-channel-capture'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
