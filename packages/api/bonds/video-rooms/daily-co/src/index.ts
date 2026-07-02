/**
 * Daily.co video rooms provider for molecule.dev.
 *
 * Implements the `@molecule/api-video-rooms` interface using the Daily.co
 * REST API.
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-video-rooms'
 * import { createProvider } from '@molecule/api-video-rooms-daily-co'
 *
 * // Bond at startup (reads DAILY_CO_API_KEY by default)
 * setProvider(createProvider())
 *
 * // Or with explicit config
 * setProvider(createProvider({ apiKey: 'd0c...' }))
 * ```
 */

export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
