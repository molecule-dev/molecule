/**
 * In-memory cache provider for molecule.dev.
 *
 * A simple, zero-dependency cache provider for development and testing.
 * Not suitable for production multi-instance deployments.
 *
 * @example
 * ```typescript
 * import { getOrSet, set, get, setProvider } from '@molecule/api-cache'
 * import { createProvider } from '@molecule/api-cache-memory'
 *
 * // Startup: bond the in-memory cache once, before any cache call.
 * setProvider(createProvider({ maxSize: 1000, defaultTtl: 300 }))
 *
 * await set('user:123:profile', { name: 'Ada' }, { ttl: 60 })
 * const profile = await get<{ name: string }>('user:123:profile') // { name: 'Ada' }
 *
 * // Cache-aside: the loader runs on the first call only; later calls hit the cache.
 * const stats = await getOrSet('stats:daily', async () => ({ visits: 42 }), { ttl: 600 })
 * ```
 *
 * @remarks
 * - **Not `bond('cache-memory', ...)`.** Wire it through the core: `setProvider(createProvider())`
 *   from `@molecule/api-cache` (or `setProvider(provider)` for the lazy default instance). Cache
 *   calls made before that throw "Cache provider not configured".
 * - **Per-process only.** Each server process has its own `Map`; entries are not shared across
 *   instances and are lost on restart. Use `@molecule/api-cache-redis` only when a managed Redis
 *   (`REDIS_URL`) is actually provisioned.
 * - **`ttl` and `defaultTtl` are SECONDS**, not milliseconds; `cleanupInterval` IS milliseconds
 *   (default `60000`, `0` disables the sweep timer — useful in tests).
 * - `maxSize` (default 1000) evicts the least-recently-used entry when full — a full cache drops
 *   data silently, it does not throw.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
