/**
 * In-memory cache provider for molecule.dev.
 *
 * A simple, zero-dependency cache provider for development and testing.
 * Not suitable for production multi-instance deployments.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-cache'
 * import { provider } from '@molecule/api-cache-memory'
 *
 * setProvider(provider) // no server required — in-process, per-instance
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
