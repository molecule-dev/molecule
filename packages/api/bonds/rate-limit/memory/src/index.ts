/**
 * In-memory rate-limit provider for molecule.dev.
 *
 * Provides a fixed-window rate limiter backed by an in-memory `Map`.
 * Ideal for development, testing, and single-instance deployments.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-rate-limit'
 * import { provider } from '@molecule/api-rate-limit-memory'
 *
 * setProvider(provider)
 * provider.configure({ windowMs: 60_000, max: 100 })
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
