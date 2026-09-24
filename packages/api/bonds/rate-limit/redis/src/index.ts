/**
 * Redis sliding-window rate-limit provider for molecule.dev.
 *
 * Provides a distributed rate limiter backed by Redis sorted sets,
 * implementing a precise sliding-window algorithm. Suitable for
 * multi-instance and clustered deployments.
 *
 * @example
 * ```typescript
 * import { configure, consume, setProvider } from '@molecule/api-rate-limit'
 * import { createProvider } from '@molecule/api-rate-limit-redis'
 *
 * // Startup. Env: REDIS_URL (e.g. rediss://redis.example.com:6380) — shared by every instance.
 * setProvider(createProvider({ url: process.env.REDIS_URL, failMode: 'closed' }))
 * configure({ windowMs: 60_000, max: 5, keyPrefix: 'login' }) // windowMs is MILLISECONDS
 *
 * // e.g. inside a login handler — key by the ATTEMPTED identifier, not only the IP.
 * const attemptLogin = async (email: string) => {
 *   const limit = await consume(email.toLowerCase())
 *   if (!limit.allowed) return { status: 429, retryAfter: limit.retryAfter } // SECONDS
 *   return { status: 200, remaining: limit.remaining }
 * }
 *
 * const results = []
 * for (let attempt = 0; attempt < 6; attempt++) results.push(await attemptLogin('Ada@example.com'))
 * // results[4] → { status: 200, remaining: 0 }; results[5] → { status: 429, retryAfter: 60 }
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
 * - **Sliding window**: `retryAfter` is always the FULL window in seconds
 *   (`ceil(windowMs / 1000)`), not the time until the oldest hit expires. A rejected
 *   `consume()` does not count against the window.
 * - Keys in Redis are `<keyPrefix option, default 'rl:'><configure keyPrefix>:<key>` — the
 *   two prefixes are different things (Redis namespace vs. bucket namespace).
 * - The provider exposes no `close()`; its ioredis connection lives for the process.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
