/**
 * Provider-agnostic rate-limiting interface for molecule.dev.
 *
 * Defines the `RateLimitProvider` interface for request throttling with
 * configurable windows, token consumption, and reset. Bond packages
 * (in-memory, Redis, etc.) implement this interface. Application code
 * uses the convenience functions (`check`, `consume`, `reset`, `getRemaining`)
 * which delegate to the bonded provider, or the Express middleware factory.
 *
 * @example
 * ```typescript
 * import { setProvider, consume, createRateLimitMiddleware } from '@molecule/api-rate-limit'
 * import { provider as memory } from '@molecule/api-rate-limit-memory'
 *
 * setProvider(memory)
 *
 * // Use convenience functions directly
 * const result = await consume('user:123')
 * if (!result.allowed) console.log('Rate limited, retry after', result.retryAfter)
 *
 * // Or as Express middleware
 * app.use(createRateLimitMiddleware({ windowMs: 60_000, max: 100 }))
 * ```
 *
 * @module
 */

// Type exports
export * from './types.js'

// Provider exports
export * from './provider.js'

// Middleware exports
export * from './middleware.js'
