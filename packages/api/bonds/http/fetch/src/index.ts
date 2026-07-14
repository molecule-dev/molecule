/**
 * Native fetch HTTP client provider for molecule.dev.
 *
 * @example
 * ```typescript
 * import { setClient } from '@molecule/api-http'
 * import { provider } from '@molecule/api-http-fetch'
 *
 * setClient(provider)
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
