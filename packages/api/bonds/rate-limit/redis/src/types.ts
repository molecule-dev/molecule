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
    }
  }
}

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
}
