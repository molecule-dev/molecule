/**
 * Redis sliding-window rate-limit provider for molecule.dev.
 *
 * Provides a distributed rate limiter backed by Redis sorted sets,
 * implementing a precise sliding-window algorithm. Suitable for
 * multi-instance and clustered deployments.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-rate-limit'
 * import { provider } from '@molecule/api-rate-limit-redis'
 *
 * setProvider(provider)
 *
 * // Or create a custom instance with explicit Redis config
 * import { createProvider } from '@molecule/api-rate-limit-redis'
 *
 * const redisRateLimit = createProvider({ url: 'redis://my-redis:6379' })
 * setProvider(redisRateLimit)
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
