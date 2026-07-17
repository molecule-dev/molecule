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
 *
 * // Fail CLOSED (deny) on a Redis outage for an abuse-sensitive deployment:
 * const strict = createProvider({ url: 'redis://my-redis:6379', failMode: 'closed' })
 * ```
 *
 * @remarks
 * - **Requires a reachable Redis server** (`REDIS_URL`, or `REDIS_HOST`/`REDIS_PORT`/
 *   `REDIS_PASSWORD`; defaults to `localhost:6379`). Connection config is read on FIRST
 *   use (lazy), so env vars may be set any time before the first rate-limit call.
 * - **Backend-failure policy is configurable and NEVER silent.** When Redis is
 *   unreachable/errors on a limit decision (`check`/`consume`/`getRemaining`), the error
 *   is ALWAYS logged at `error` severity, then the configured `failMode` applies:
 *   `'open'` (**default**) ADMITS the request (rate limiting is degraded/disabled until
 *   Redis recovers); `'closed'` DENIES it (429). Set via the `failMode` option or the
 *   `REDIS_RATE_LIMIT_FAIL_MODE` env var. Default is `'open'` because a rate limiter is
 *   an availability control — failing closed turns a Redis blip into a full outage for
 *   every legitimate user. Use `'closed'` on abuse-sensitive endpoints (login, OTP,
 *   password reset), and don't rely on this limiter as the ONLY control there.
 * - `consume()` is atomic (single server-side Lua script) — concurrent requests cannot
 *   overshoot the limit. `check()`/`getRemaining()` are non-mutating estimates.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
