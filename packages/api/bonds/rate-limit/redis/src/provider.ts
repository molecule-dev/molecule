/**
 * Redis sliding-window implementation of the rate-limit provider.
 *
 * Uses a sorted set per key to implement a precise sliding-window algorithm.
 * Each request is recorded as a member with a timestamp score, and expired
 * entries are pruned on every operation. This is more accurate than a
 * fixed-window approach and suitable for distributed/multi-instance deployments.
 *
 * @module
 */

import { Redis } from 'ioredis'

import type { RateLimitOptions, RateLimitProvider, RateLimitResult } from '@molecule/api-rate-limit'

import type { RedisRateLimitOptions } from './types.js'

/** Default window: 60 seconds. */
const DEFAULT_WINDOW_MS = 60_000

/** Default max requests per window. */
const DEFAULT_MAX = 100

/** Default key prefix for rate-limit sorted sets. */
const DEFAULT_KEY_PREFIX = 'rl:'

/**
 * Creates a Redis-backed rate-limit provider implementing the sliding-window
 * algorithm. Reads `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD`
 * from environment variables when explicit options are not provided.
 *
 * @param redisOptions - Redis connection and behavior options.
 * @returns A `RateLimitProvider` backed by Redis.
 */
export const createProvider = (redisOptions?: RedisRateLimitOptions): RateLimitProvider => {
  const url = redisOptions?.url ?? process.env.REDIS_URL
  const host = redisOptions?.host ?? process.env.REDIS_HOST ?? 'localhost'
  const port = redisOptions?.port ?? parseInt(process.env.REDIS_PORT ?? '6379', 10)
  const password = redisOptions?.password ?? process.env.REDIS_PASSWORD
  const redisKeyPrefix = redisOptions?.keyPrefix ?? DEFAULT_KEY_PREFIX

  const client = url
    ? new Redis(url, { keyPrefix: redisKeyPrefix })
    : new Redis({
        host,
        port,
        password,
        db: redisOptions?.db ?? 0,
        keyPrefix: redisKeyPrefix,
      })

  /** Current rate-limit configuration. */
  let config: RateLimitOptions = {
    windowMs: DEFAULT_WINDOW_MS,
    max: DEFAULT_MAX,
  }

  /**
   * Resolves the full Redis key for a rate-limit bucket.
   *
   * @param key - The raw bucket key.
   * @returns The key with optional user-level prefix applied.
   */
  const resolveKey = (key: string): string => {
    return config.keyPrefix ? `${config.keyPrefix}:${key}` : key
  }

  /**
   * Counts current requests in the sliding window and prunes expired entries.
   * Uses a Redis pipeline for atomicity.
   *
   * @param fullKey - The resolved Redis key.
   * @param now - Current timestamp in milliseconds.
   * @returns The number of requests currently in the window.
   */
  const countInWindow = async (fullKey: string, now: number): Promise<number> => {
    const windowStart = now - config.windowMs
    const pipeline = client.pipeline()
    pipeline.zremrangebyscore(fullKey, 0, windowStart)
    pipeline.zcard(fullKey)
    const results = await pipeline.exec()

    if (!results || !results[1]) return 0
    const [err, count] = results[1]
    if (err) return 0
    return count as number
  }

  /**
   * Builds a `RateLimitResult` from the current window state.
   *
   * @param count - Number of consumed tokens in the current window.
   * @param allowed - Whether the request is allowed.
   * @param now - Current timestamp in milliseconds.
   * @returns The rate limit result.
   */
  const buildResult = (count: number, allowed: boolean, now: number): RateLimitResult => {
    const remaining = Math.max(0, config.max - count)
    const resetAt = new Date(now + config.windowMs)
    const result: RateLimitResult = {
      allowed,
      remaining,
      total: config.max,
      resetAt,
    }

    if (!allowed) {
      result.retryAfter = Math.max(1, Math.ceil(config.windowMs / 1000))
    }

    return result
  }

  return {
    async check(key: string): Promise<RateLimitResult> {
      const fullKey = resolveKey(key)
      const now = Date.now()
      const count = await countInWindow(fullKey, now)
      const allowed = count < config.max
      return buildResult(count, allowed, now)
    },

    async consume(key: string, cost = 1): Promise<RateLimitResult> {
      const fullKey = resolveKey(key)
      const now = Date.now()
      const count = await countInWindow(fullKey, now)

      if (count + cost > config.max) {
        return buildResult(count, false, now)
      }

      // Add entries to the sorted set (one per unit of cost)
      const pipeline = client.pipeline()
      for (let i = 0; i < cost; i++) {
        // Use timestamp + random suffix to ensure unique members
        const member = `${now}:${Math.random().toString(36).slice(2, 8)}:${i}`
        pipeline.zadd(fullKey, String(now), member)
      }
      // Set TTL on the key to auto-expire after the window
      pipeline.pexpire(fullKey, config.windowMs)
      await pipeline.exec()

      return buildResult(count + cost, true, now)
    },

    async reset(key: string): Promise<void> {
      const fullKey = resolveKey(key)
      await client.del(fullKey)
    },

    async getRemaining(key: string): Promise<number> {
      const fullKey = resolveKey(key)
      const now = Date.now()
      const count = await countInWindow(fullKey, now)
      return Math.max(0, config.max - count)
    },

    configure(options: RateLimitOptions): void {
      config = { ...config, ...options }
    },
  }
}

/** Lazily-initialized default provider instance. */
let _provider: RateLimitProvider | null = null

/**
 * Default Redis rate-limit provider instance. Lazily initialises on first
 * property access using environment variables for connection config.
 */
export const provider: RateLimitProvider = new Proxy({} as RateLimitProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
})
