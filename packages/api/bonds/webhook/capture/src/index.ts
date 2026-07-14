/**
 * Webhook capture provider for molecule.dev.
 *
 * Records every `dispatch()` call as an activity event. Intercept-only by
 * default; delegates + tees when wrapping a real provider.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-webhook'
 * import { provider } from '@molecule/api-webhook-capture'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
