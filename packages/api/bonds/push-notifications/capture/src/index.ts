/**
 * Push notification capture provider for molecule.dev.
 *
 * Records every `send()` / `sendMany()` call as an activity event.
 * Intercept-only by default; delegates + tees when wrapping a real provider.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-push-notifications'
 * import { provider } from '@molecule/api-push-capture'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './provider.js'
