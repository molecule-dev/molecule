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
 * @remarks
 * - **Requires a reachable Redis server** (`REDIS_URL`, or `REDIS_HOST`/`REDIS_PORT`/
 *   `REDIS_PASSWORD`; defaults to `localhost:6379`). Connection config is read on FIRST
 *   use (lazy), so env vars may be set any time before the first rate-limit call.
 * - **Fails OPEN, not closed.** A Redis-side error never blocks traffic: `consume()`
 *   allows the request when the atomic script's reply is unusable, and
 *   `check()`/`getRemaining()` treat command errors as an empty window. A hard
 *   connection failure surfaces as a thrown/hung call instead (ioredis retries) — so an
 *   unreachable Redis degrades or disables rate limiting rather than denying requests.
 *   Don't rely on this limiter as the ONLY control on an abuse-sensitive endpoint.
 * - `consume()` is atomic (single server-side Lua script) — concurrent requests cannot
 *   overshoot the limit. `check()`/`getRemaining()` are non-mutating estimates.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
