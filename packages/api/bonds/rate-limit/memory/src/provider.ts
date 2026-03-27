/**
 * In-memory implementation of the rate-limit provider.
 *
 * Uses a simple fixed-window algorithm with a `Map` for storage.
 * Suitable for development and single-instance deployments.
 * Not suitable for multi-instance/clustered environments — use
 * `@molecule/api-rate-limit-redis` for distributed rate limiting.
 *
 * @module
 */

import type { RateLimitOptions, RateLimitProvider, RateLimitResult } from '@molecule/api-rate-limit'

import type { MemoryBucket } from './types.js'

/** Default window: 60 seconds. */
const DEFAULT_WINDOW_MS = 60_000

/** Default max requests per window. */
const DEFAULT_MAX = 100

/** Store of active rate limit buckets keyed by prefixed key. */
const store = new Map<string, MemoryBucket>()

/** Current configuration. */
let config: RateLimitOptions = {
  windowMs: DEFAULT_WINDOW_MS,
  max: DEFAULT_MAX,
}

/** Cleanup interval handle. */
let cleanupTimer: ReturnType<typeof setInterval> | null = null

/**
 * Starts the periodic cleanup of expired buckets.
 * Runs every `windowMs` to prevent unbounded memory growth.
 */
const startCleanup = (): void => {
  stopCleanup()
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of store) {
      if (now - bucket.windowStart >= config.windowMs) {
        store.delete(key)
      }
    }
  }, config.windowMs)

  // Allow the process to exit even if the timer is still running
  if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref()
  }
}

/**
 * Stops the periodic cleanup timer.
 */
const stopCleanup = (): void => {
  if (cleanupTimer !== null) {
    clearInterval(cleanupTimer)
    cleanupTimer = null
  }
}

/**
 * Resolves the full key including any configured prefix.
 *
 * @param key - The raw bucket key.
 * @returns The prefixed key.
 */
const resolveKey = (key: string): string => {
  return config.keyPrefix ? `${config.keyPrefix}:${key}` : key
}

/**
 * Gets or creates a bucket for the given key, resetting if the window has expired.
 *
 * @param fullKey - The prefixed bucket key.
 * @returns The current bucket.
 */
const getBucket = (fullKey: string): MemoryBucket => {
  const now = Date.now()
  const existing = store.get(fullKey)

  if (existing && now - existing.windowStart < config.windowMs) {
    return existing
  }

  const bucket: MemoryBucket = { consumed: 0, windowStart: now }
  store.set(fullKey, bucket)
  return bucket
}

/**
 * Builds a `RateLimitResult` from the current bucket state.
 *
 * @param bucket - The bucket to build the result from.
 * @param allowed - Whether the request is allowed.
 * @returns The rate limit result.
 */
const buildResult = (bucket: MemoryBucket, allowed: boolean): RateLimitResult => {
  const remaining = Math.max(0, config.max - bucket.consumed)
  const resetAt = new Date(bucket.windowStart + config.windowMs)
  const result: RateLimitResult = {
    allowed,
    remaining,
    total: config.max,
    resetAt,
  }

  if (!allowed) {
    result.retryAfter = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000))
  }

  return result
}

/**
 * In-memory rate-limit provider.
 *
 * Implements the `RateLimitProvider` interface using a fixed-window algorithm
 * backed by an in-memory `Map`.
 */
export const provider: RateLimitProvider = {
  async check(key: string): Promise<RateLimitResult> {
    const fullKey = resolveKey(key)
    const bucket = getBucket(fullKey)
    const allowed = bucket.consumed < config.max
    return buildResult(bucket, allowed)
  },

  async consume(key: string, cost = 1): Promise<RateLimitResult> {
    const fullKey = resolveKey(key)
    const bucket = getBucket(fullKey)

    const wouldExceed = bucket.consumed + cost > config.max
    if (wouldExceed) {
      return buildResult(bucket, false)
    }

    bucket.consumed += cost
    return buildResult(bucket, true)
  },

  async reset(key: string): Promise<void> {
    const fullKey = resolveKey(key)
    store.delete(fullKey)
  },

  async getRemaining(key: string): Promise<number> {
    const fullKey = resolveKey(key)
    const bucket = getBucket(fullKey)
    return Math.max(0, config.max - bucket.consumed)
  },

  configure(options: RateLimitOptions): void {
    config = { ...config, ...options }
    startCleanup()
  },
}

// Start cleanup on module load
startCleanup()
