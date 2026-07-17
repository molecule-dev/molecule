/**
 * Type definitions for the Redis rate-limit provider.
 *
 * @module
 */

export type { RateLimitOptions, RateLimitProvider, RateLimitResult } from '@molecule/api-rate-limit'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    /**
     * Process environment variables used by the Redis rate-limit provider.
     */
    export interface ProcessEnv {
      /** Redis connection URL (e.g. `redis://localhost:6379`). */
      REDIS_URL?: string
      /** Redis host (defaults to `localhost`). */
      REDIS_HOST?: string
      /** Redis port (defaults to `6379`). */
      REDIS_PORT?: string
      /** Redis password. */
      REDIS_PASSWORD?: string
      /**
       * Behavior when Redis is unreachable on a limit decision: `open` (admit,
       * the default) or `closed` (deny). See {@link RedisRateLimitOptions.failMode}.
       */
      REDIS_RATE_LIMIT_FAIL_MODE?: 'open' | 'closed'
    }
  }
}

/**
 * How the limiter behaves when the Redis backend is unreachable or errors on a
 * limit decision.
 *
 * - `'open'` — ADMIT the request (rate limiting is effectively disabled while
 *   Redis is down).
 * - `'closed'` — DENY the request (respond 429).
 */
export type RedisFailMode = 'open' | 'closed'

/**
 * Options for creating a Redis rate-limit provider.
 */
export interface RedisRateLimitOptions {
  /** Redis connection URL. Takes precedence over host/port/password. */
  url?: string
  /** Redis host (defaults to `localhost` or `REDIS_HOST` env). */
  host?: string
  /** Redis port (defaults to `6379` or `REDIS_PORT` env). */
  port?: number
  /** Redis password (defaults to `REDIS_PASSWORD` env). */
  password?: string
  /** Redis database index (defaults to `0`). */
  db?: number
  /** Prefix for all rate-limit keys in Redis (defaults to `rl:`). */
  keyPrefix?: string
  /**
   * What to do when Redis is unreachable/errors on a limit decision
   * (`check`/`consume`/`getRemaining`):
   *
   * - `'open'` (**default**) — ADMIT the request. A transient Redis blip does
   *   not deny all traffic; rate limiting is simply degraded/disabled until
   *   Redis recovers. Does NOT protect the backend from abuse during the outage.
   * - `'closed'` — DENY the request (429). Protects an abuse-sensitive endpoint
   *   (login, OTP, password reset) at the cost of locking out legitimate users
   *   while Redis is down.
   *
   * The backend error is ALWAYS logged at `error` severity regardless of mode —
   * the failure is never silent. Defaults from the `REDIS_RATE_LIMIT_FAIL_MODE`
   * env var when unset here, else `'open'`.
   *
   * Why `'open'` is the default: a rate limiter is an availability-protection
   * control, not an auth control. Failing closed converts a dependency hiccup
   * into a full outage for every legitimate user — usually a worse blast radius
   * than briefly un-throttled traffic. Set `'closed'` for endpoints where abuse
   * protection outweighs availability.
   */
  failMode?: RedisFailMode
}
