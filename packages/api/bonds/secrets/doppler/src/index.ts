/**
 * Doppler secrets provider for molecule.dev.
 *
 * Retrieves secrets from Doppler using their API.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-secrets'
 * import { provider } from '@molecule/api-secrets-doppler'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
