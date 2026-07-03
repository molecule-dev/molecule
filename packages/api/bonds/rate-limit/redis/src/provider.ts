/**
 * Redis sliding-window implementation of the rate-limit provider.
 *
 * Uses a sorted set per key to implement a precise sliding-window algorithm.
 * Each request is recorded as a member with a timestamp score, and expired
 * entries are pruned on every operation. This is more accurate than a
 * fixed-window approach and suitable for distributed/multi-instance deployments.
 *
 * `consume()` is **atomic**: the prune → count → limit-check → conditional
 * insert all run inside a single server-side Lua script (`EVAL`), so concurrent
 * requests against the same key cannot overshoot the limit (no check-then-act
 * race). `check()`/`getRemaining()` are read-only estimates and intentionally
 * non-mutating.
 *
 * @module
 */

import { Redis } from 'ioredis'

import type { RateLimitOptions, RateLimitProvider, RateLimitResult } from '@molecule/api-rate-limit'

import type { RedisRateLimitOptions } from './types.js'

/**
 * Atomic sliding-window consume script.
 *
 * Runs entirely server-side in one round trip so the count-and-increment is a
 * single atomic operation (no check-then-act race across separate awaits):
 *
 * 1. `ZREMRANGEBYSCORE` — prune entries older than the window.
 * 2. `ZCARD` — count entries currently in the window.
 * 3. Compare `count + cost` against `max`; if it would exceed, reject without
 *    mutating (return `{0, count}`).
 * 4. Otherwise `ZADD` one member per unit of cost and `PEXPIRE` the key to the
 *    window length, returning `{1, count + cost}`.
 *
 * KEYS[1]  = the sorted-set key.
 * ARGV[1]  = window-start score (entries with score <= this are pruned).
 * ARGV[2]  = `now` score applied to inserted members.
 * ARGV[3]  = max requests allowed in the window.
 * ARGV[4]  = cost (number of members to insert).
 * ARGV[5]  = window length in ms (PEXPIRE TTL).
 * ARGV[6.] = the unique members to insert (one per unit of cost).
 *
 * Returns `{ allowed (1|0), resultingCount }`.
 */
const CONSUME_SCRIPT = `
local windowStart = tonumber(ARGV[1])
local now = ARGV[2]
local max = tonumber(ARGV[3])
local cost = tonumber(ARGV[4])
local windowMs = tonumber(ARGV[5])

redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, windowStart)
local count = redis.call('ZCARD', KEYS[1])

if count + cost > max then
  return { 0, count }
end

for i = 6, #ARGV do
  redis.call('ZADD', KEYS[1], now, ARGV[i])
end
redis.call('PEXPIRE', KEYS[1], windowMs)

return { 1, count + cost }
`

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
   * Batches the prune + count into a single Redis pipeline (one round trip).
   * NOTE: a pipeline only batches commands — it is **not** atomic, so this is a
   * point-in-time estimate suitable for the read-only `check()`/`getRemaining()`
   * paths. The mutating `consume()` path must not rely on a separate read here;
   * it uses the atomic {@link CONSUME_SCRIPT} (`EVAL`) instead.
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
      const windowStart = now - config.windowMs

      // Generate one unique member per unit of cost (timestamp + random suffix).
      const members: string[] = []
      for (let i = 0; i < cost; i++) {
        members.push(`${now}:${Math.random().toString(36).slice(2, 8)}:${i}`)
      }

      // Atomically prune → count → check → conditionally insert in a single
      // server-side Lua script. This eliminates the check-then-act race that a
      // separate read (countInWindow) + write (pipeline) suffered under
      // concurrency, which let N concurrent requests all read count=0 and pass.
      const reply = await client.eval(
        CONSUME_SCRIPT,
        1,
        fullKey,
        String(windowStart),
        String(now),
        String(config.max),
        String(cost),
        String(config.windowMs),
        ...members,
      )

      // Reply shape: [allowed (1|0), resultingCount]. Parse defensively — a Redis
      // reply is untyped, and a connection/script error should fail open (allow)
      // to match the read-paths' resilience rather than hard-blocking traffic.
      if (!Array.isArray(reply)) {
        return buildResult(cost, true, now)
      }
      const allowed = Number(reply[0]) === 1
      const count = Number(reply[1] ?? 0)

      return buildResult(count, allowed, now)
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
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
