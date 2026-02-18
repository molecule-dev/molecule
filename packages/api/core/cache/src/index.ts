/**
 * Provider-agnostic caching interface for molecule.dev.
 *
 * Defines the `CacheProvider` interface for key-value caching with TTL, tags,
 * batch operations, and cache-aside (`getOrSet`). Bond packages (Redis, Memcached,
 * in-memory, etc.) implement this interface. Application code uses the convenience
 * functions (`get`, `set`, `del`, `has`, `getOrSet`) which delegate to the bonded provider.
 *
 * @example
 * ```typescript
 * import { setProvider, get, set, getOrSet } from '@molecule/api-cache'
 * import { provider as redis } from '@molecule/api-cache-redis'
 *
 * setProvider(redis)
 * await set('user:123', userData, { ttl: 3600 })
 * const cached = await get<UserData>('user:123')
 * const fresh = await getOrSet('user:456', () => fetchUser('456'), { ttl: 600 })
 * ```
 *
 * @module
 */

// Type exports
export * from './types.js'

// Provider exports
export * from './provider.js'
