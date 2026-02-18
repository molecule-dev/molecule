/**
 * Redis cache provider implementation.
 *
 * @module
 */

import { Redis } from 'ioredis'

import { getLogger } from '@molecule/api-bond'
const logger = getLogger()
import type { CacheOptions, CacheProvider } from '@molecule/api-cache'

import type { RedisOptions } from './types.js'

/**
 * Creates a Redis-backed cache provider that implements the `CacheProvider`
 * interface using ioredis. Supports tag-based invalidation via Redis sets.
 * Reads `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD` from env.
 *
 * @param options - Redis connection and behavior options (URL, host, port, password, key prefix).
 * @returns A `CacheProvider` backed by Redis.
 */
export const createProvider = (options?: RedisOptions): CacheProvider => {
  const url = options?.url ?? process.env.REDIS_URL
  const host = options?.host ?? process.env.REDIS_HOST ?? 'localhost'
  const port = options?.port ?? parseInt(process.env.REDIS_PORT ?? '6379', 10)
  const password = options?.password ?? process.env.REDIS_PASSWORD
  const keyPrefix = options?.keyPrefix ?? 'molecule:'

  const client = url
    ? new Redis(url, { keyPrefix })
    : new Redis({
        host,
        port,
        password,
        db: options?.db ?? 0,
        keyPrefix,
      })

  client.on('error', (err: Error) => {
    logger.error('Redis error:', err)
  })

  client.on('connect', () => {
    logger.debug('Redis connected')
  })

  // Track tags for tag-based invalidation
  const getTagKey = (tag: string): string => `_tag:${tag}`

  return {
    async get<T = unknown>(key: string): Promise<T | undefined> {
      const value = await client.get(key)
      if (value === null) return undefined
      try {
        return JSON.parse(value) as T
      } catch {
        return value as unknown as T
      }
    },

    async set<T = unknown>(key: string, value: T, options?: CacheOptions): Promise<void> {
      const serialized = JSON.stringify(value)
      if (options?.ttl) {
        await client.setex(key, options.ttl, serialized)
      } else {
        await client.set(key, serialized)
      }

      // Track tags
      if (options?.tags) {
        for (const tag of options.tags) {
          await client.sadd(getTagKey(tag), key)
        }
      }
    },

    async delete(key: string): Promise<boolean> {
      const result = await client.del(key)
      return result > 0
    },

    async has(key: string): Promise<boolean> {
      const result = await client.exists(key)
      return result > 0
    },

    async getMany<T = unknown>(keys: string[]): Promise<Map<string, T>> {
      const results = new Map<string, T>()
      if (keys.length === 0) return results

      const values = await client.mget(...keys)
      for (let i = 0; i < keys.length; i++) {
        const value = values[i]
        if (value !== null) {
          try {
            results.set(keys[i], JSON.parse(value) as T)
          } catch {
            results.set(keys[i], value as unknown as T)
          }
        }
      }
      return results
    },

    async setMany<T = unknown>(entries: Array<[string, T]>, options?: CacheOptions): Promise<void> {
      if (entries.length === 0) return

      const pipeline = client.pipeline()
      for (const [key, value] of entries) {
        const serialized = JSON.stringify(value)
        if (options?.ttl) {
          pipeline.setex(key, options.ttl, serialized)
        } else {
          pipeline.set(key, serialized)
        }

        if (options?.tags) {
          for (const tag of options.tags) {
            pipeline.sadd(getTagKey(tag), key)
          }
        }
      }
      await pipeline.exec()
    },

    async deleteMany(keys: string[]): Promise<number> {
      if (keys.length === 0) return 0
      return await client.del(...keys)
    },

    async invalidateTag(tag: string): Promise<void> {
      const tagKey = getTagKey(tag)
      const keys = await client.smembers(tagKey)
      if (keys.length > 0) {
        await client.del(...keys)
      }
      await client.del(tagKey)
    },

    async clear(): Promise<void> {
      await client.flushdb()
    },

    async close(): Promise<void> {
      await client.quit()
    },

    async getOrSet<T = unknown>(
      key: string,
      factory: () => Promise<T>,
      options?: CacheOptions,
    ): Promise<T> {
      const cached = await this.get<T>(key)
      if (cached !== undefined) return cached

      const value = await factory()
      await this.set(key, value, options)
      return value
    },
  }
}

/**
 * The default Redis provider instance.
 */
let _provider: CacheProvider | null = null
/**
 * The provider implementation.
 */
export const provider: CacheProvider = new Proxy({} as CacheProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
})

/**
 * Creates a raw ioredis `Redis` client for direct API access,
 * bypassing the `CacheProvider` abstraction.
 *
 * @param options - Redis connection options (URL, host, port, password, db).
 * @returns A raw ioredis `Redis` client instance.
 */
export const createClient = (options?: Omit<RedisOptions, 'keyPrefix'>): Redis => {
  const url = options?.url ?? process.env.REDIS_URL
  if (url) return new Redis(url)

  const host = options?.host ?? process.env.REDIS_HOST ?? 'localhost'
  const port = options?.port ?? parseInt(process.env.REDIS_PORT ?? '6379', 10)
  const password = options?.password ?? process.env.REDIS_PASSWORD
  const db = options?.db ?? 0

  return new Redis({ host, port, password, db })
}
