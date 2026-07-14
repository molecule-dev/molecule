/**
 * Express CORS provider for molecule.dev.
 *
 * @example
 * ```typescript
 * import { setCors, setCorsFactory } from '@molecule/api-middleware-cors'
 * import { provider, corsFactory } from '@molecule/api-middleware-cors-express'
 *
 * setCors(provider)
 * setCorsFactory(corsFactory)
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
