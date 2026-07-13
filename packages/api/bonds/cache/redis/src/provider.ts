/**
 * Redis cache provider implementation.
 *
 * @module
 */

import { Redis } from 'ioredis'

import { getLogger } from '@molecule/api-bond'
const logger = getLogger()
// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'

import type { CacheOptions, CacheProvider } from '@molecule/api-cache'

import type { RedisOptions } from './types.js'

/**
 * Maximum keys UNLINKed in a single command by `clear()`'s scoped-scan loop —
 * bounds the size of any one command even when a provider has accumulated a
 * very large number of keys under its prefix.
 */
const CLEAR_UNLINK_BATCH_SIZE = 500

/**
 * Creates a Redis-backed cache provider that implements the `CacheProvider`
 * interface using ioredis. Supports tag-based invalidation via Redis sets.
 * Reads `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD` from env.
 *
 * @param options - Redis connection and behavior options (URL, host, port, password, key prefix).
 * @returns A `CacheProvider` backed by Redis.
 */
export const createProvider = (options?: RedisOptions): CacheProvider => {
  // Explicit config beats ambient env: a caller passing discrete connection
  // options (host/port/password/db) must not have them silently overridden by
  // a REDIS_URL that happens to be set in the environment — env vars only
  // fill in what the call site left unspecified.
  const hasExplicitTarget =
    options?.host !== undefined ||
    options?.port !== undefined ||
    options?.password !== undefined ||
    options?.db !== undefined
  const url = options?.url ?? (hasExplicitTarget ? undefined : process.env.REDIS_URL)
  const host = options?.host ?? process.env.REDIS_HOST ?? 'localhost'
  const port = options?.port ?? parseInt(process.env.REDIS_PORT ?? '6379', 10)
  const password = options?.password ?? process.env.REDIS_PASSWORD
  const keyPrefix = options?.keyPrefix ?? 'molecule:'
  // Forwarded to ioredis unchanged; `undefined` entries are skipped by ioredis'
  // own option defaulting (lodash `defaults`), so omitting these from `options`
  // keeps ioredis' stock (slow-retry) behavior exactly as before.
  const failFastOptions = {
    maxRetriesPerRequest: options?.maxRetriesPerRequest,
    enableOfflineQueue: options?.enableOfflineQueue,
    commandTimeout: options?.commandTimeout,
  }

  const client = url
    ? new Redis(url, { keyPrefix, ...failFastOptions })
    : new Redis({
        host,
        port,
        password,
        db: options?.db ?? 0,
        keyPrefix,
        ...failFastOptions,
      })

  client.on('error', (err: Error) => {
    logger.error('Redis error:', err)
  })

  client.on('connect', () => {
    logger.debug('Redis connected')
  })

  // --- Tag tracking ----------------------------------------------------------
  //
  // `_tag:<tag>` is the Redis SET of keys carrying that tag (unchanged shape).
  // `_tags:<key>` is a reverse index of which tags a KEY currently carries, so
  // `set()` (on a re-set with different/no tags) and `delete()`/`deleteMany()`
  // can SREM the key out of exactly its OLD tag sets — without this,
  // `invalidateTag()` would delete keys that were re-set WITHOUT the tag
  // (historical membership winning over current membership).
  const getTagKey = (tag: string): string => `_tag:${tag}`
  const getTagsIndexKey = (key: string): string => `_tags:${key}`

  /**
   * Detaches `key` from every tag it is CURRENTLY recorded under (per its
   * reverse index) and drops the reverse index entry itself.
   */
  const detachTags = async (key: string): Promise<void> => {
    const tagsIndexKey = getTagsIndexKey(key)
    const raw = await client.get(tagsIndexKey)
    if (!raw) return
    let tags: string[] = []
    try {
      tags = JSON.parse(raw) as string[]
    } catch (_error) {
      // Corrupt reverse-index value — nothing sensible to detach from; fall through to drop it.
    }
    if (tags.length > 0) {
      const pipeline = client.pipeline()
      for (const tag of tags) {
        pipeline.srem(getTagKey(tag), key)
      }
      pipeline.del(tagsIndexKey)
      await pipeline.exec()
    } else {
      await client.del(tagsIndexKey)
    }
  }

  return {
    async get<T = unknown>(key: string): Promise<T | undefined> {
      try {
        const value = await client.get(key)
        if (value === null) return undefined
        try {
          return JSON.parse(value) as T
        } catch (_error) {
          // Value is not valid JSON — return the raw string as-is (safe: best-effort parse)
          return value as unknown as T
        }
      } catch (error) {
        // Normalized down-server behavior (matches the Memcached bond): a read
        // that fails (unreachable/timed-out Redis) degrades to "not cached"
        // instead of throwing — check the logs to tell this apart from a real miss.
        logger.error('Redis get error — treating as a cache miss:', error)
        return undefined
      }
    },

    async set<T = unknown>(key: string, value: T, options?: CacheOptions): Promise<void> {
      const serialized = JSON.stringify(value)

      // A re-set must REPLACE this key's tag memberships, not accumulate them —
      // detach from whatever a prior set() attached before applying new tags.
      await detachTags(key)

      if (options?.ttl) {
        await client.setex(key, options.ttl, serialized)
      } else {
        await client.set(key, serialized)
      }

      // Track tags
      if (options?.tags && options.tags.length > 0) {
        for (const tag of options.tags) {
          await client.sadd(getTagKey(tag), key)
        }
        // Reverse index: lets a future set()/delete() detach this key from
        // exactly the tags it currently holds (see `detachTags`).
        if (options.ttl) {
          await client.setex(getTagsIndexKey(key), options.ttl, JSON.stringify(options.tags))
        } else {
          await client.set(getTagsIndexKey(key), JSON.stringify(options.tags))
        }
      }
    },

    async delete(key: string): Promise<boolean> {
      await detachTags(key)
      const result = await client.del(key)
      return result > 0
    },

    async has(key: string): Promise<boolean> {
      try {
        const result = await client.exists(key)
        return result > 0
      } catch (error) {
        logger.error('Redis has error — treating as a cache miss:', error)
        return false
      }
    },

    async getMany<T = unknown>(keys: string[]): Promise<Map<string, T>> {
      const results = new Map<string, T>()
      if (keys.length === 0) return results

      try {
        const values = await client.mget(...keys)
        for (let i = 0; i < keys.length; i++) {
          const value = values[i]
          if (value !== null) {
            try {
              results.set(keys[i], JSON.parse(value) as T)
            } catch (_error) {
              // Value is not valid JSON — store the raw string as-is (safe: best-effort parse)
              results.set(keys[i], value as unknown as T)
            }
          }
        }
      } catch (error) {
        logger.error('Redis getMany error — treating as a cache miss:', error)
      }
      return results
    },

    async setMany<T = unknown>(entries: Array<[string, T]>, options?: CacheOptions): Promise<void> {
      if (entries.length === 0) return

      // Same replace-not-accumulate rule as set(): detach each key from tags a
      // prior set()/setMany() attached before applying the new ones.
      await Promise.all(entries.map(([key]) => detachTags(key)))

      const pipeline = client.pipeline()
      for (const [key, value] of entries) {
        const serialized = JSON.stringify(value)
        if (options?.ttl) {
          pipeline.setex(key, options.ttl, serialized)
        } else {
          pipeline.set(key, serialized)
        }

        if (options?.tags && options.tags.length > 0) {
          for (const tag of options.tags) {
            pipeline.sadd(getTagKey(tag), key)
          }
          if (options.ttl) {
            pipeline.setex(getTagsIndexKey(key), options.ttl, JSON.stringify(options.tags))
          } else {
            pipeline.set(getTagsIndexKey(key), JSON.stringify(options.tags))
          }
        }
      }
      await pipeline.exec()
    },

    async deleteMany(keys: string[]): Promise<number> {
      if (keys.length === 0) return 0
      await Promise.all(keys.map((key) => detachTags(key)))
      return await client.del(...keys)
    },

    async invalidateTag(tag: string): Promise<void> {
      const tagKey = getTagKey(tag)
      const keys = await client.smembers(tagKey)
      if (keys.length > 0) {
        // Each key may belong to OTHER tags too — detach those memberships
        // (and drop the reverse index) before removing the key, so their
        // sets don't keep pointing at a now-gone key either.
        await Promise.all(keys.map((key) => detachTags(key)))
        await client.del(...keys)
      }
      await client.del(tagKey)
    },

    async clear(): Promise<void> {
      // Scoped to this provider's `keyPrefix` — NEVER FLUSHDB/FLUSHALL, which
      // would wipe every other app/subsystem sharing this Redis logical
      // database (sessions, @molecule/api-cron-bullmq queues, rate limiters, ...).
      //
      // CAVEAT: with the client's `keyPrefix` option set, SCAN's MATCH pattern
      // is NOT auto-prefixed (unlike GET/SET/DEL/UNLINK, whose key arguments
      // ARE) — so we prefix MATCH ourselves. The keys SCAN returns are
      // therefore the raw server-side keys (already carrying the prefix).
      // UNLINK re-adds the client's prefix to whatever key we pass it, so
      // each returned key must have the prefix stripped first, or we'd try
      // to delete `<keyPrefix><keyPrefix>key` — a silent no-op that would
      // leave every real key untouched.
      const matchPattern = `${keyPrefix}*`
      let cursor = '0'
      do {
        const [nextCursor, keys] = await client.scan(cursor, 'MATCH', matchPattern, 'COUNT', 200)
        cursor = nextCursor
        if (keys.length > 0) {
          const unprefixed = keys.map((key) =>
            key.startsWith(keyPrefix) ? key.slice(keyPrefix.length) : key,
          )
          for (let i = 0; i < unprefixed.length; i += CLEAR_UNLINK_BATCH_SIZE) {
            await client.unlink(...unprefixed.slice(i, i + CLEAR_UNLINK_BATCH_SIZE))
          }
        }
      } while (cursor !== '0')
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
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
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
  // Same explicit-beats-env precedence as `createProvider` above.
  const hasExplicitTarget =
    options?.host !== undefined ||
    options?.port !== undefined ||
    options?.password !== undefined ||
    options?.db !== undefined
  const url = options?.url ?? (hasExplicitTarget ? undefined : process.env.REDIS_URL)
  if (url) return new Redis(url)

  const host = options?.host ?? process.env.REDIS_HOST ?? 'localhost'
  const port = options?.port ?? parseInt(process.env.REDIS_PORT ?? '6379', 10)
  const password = options?.password ?? process.env.REDIS_PASSWORD
  const db = options?.db ?? 0

  return new Redis({ host, port, password, db })
}
