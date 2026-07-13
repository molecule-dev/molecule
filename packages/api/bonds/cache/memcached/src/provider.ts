/**
 * Memcached cache provider implementation.
 *
 * @module
 */

import Memcached from 'memcached'

import { getLogger } from '@molecule/api-bond'
const logger = getLogger()
// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'

import type { CacheOptions, CacheProvider } from '@molecule/api-cache'

import type { MemcachedOptions } from './types.js'
import { promisify } from './utilities.js'

/**
 * Memcached's protocol treats an expiration greater than 30 days (2592000 seconds)
 * as an ABSOLUTE unix timestamp, not a relative TTL. The `memcached` client passes
 * the lifetime through raw, so e.g. `ttl: 31536000` (1 year) would be read by the
 * server as February 1971 and the entry would expire IMMEDIATELY.
 */
const MEMCACHED_MAX_RELATIVE_TTL = 2592000

/**
 * Converts a relative TTL in seconds to the lifetime value memcached expects,
 * so `ttl` always means "seconds from now" regardless of magnitude.
 *
 * @param ttl - Relative TTL in seconds (`0` = no expiration, passed through).
 * @returns The lifetime to send: the TTL itself, or an absolute unix timestamp
 * when the TTL exceeds memcached's 30-day relative limit.
 */
const toMemcachedLifetime = (ttl: number): number =>
  ttl > MEMCACHED_MAX_RELATIVE_TTL ? Math.floor(Date.now() / 1000) + ttl : ttl

/**
 * Creates a Memcached-backed cache provider that implements the `CacheProvider`
 * interface. Supports tag-based invalidation by storing tag-to-key mappings
 * alongside cached values.
 *
 * @param options - Memcached connection and behavior options (servers, host, port, key prefix).
 * @returns A `CacheProvider` backed by Memcached.
 */
export const createProvider = (options?: MemcachedOptions): CacheProvider => {
  const servers =
    options?.servers ??
    process.env.MEMCACHED_SERVERS?.split(',') ??
    `${options?.host ?? process.env.MEMCACHED_HOST ?? 'localhost'}:${options?.port ?? process.env.MEMCACHED_PORT ?? '11211'}`

  const keyPrefix = options?.keyPrefix ?? 'molecule:'
  const client = new Memcached(servers, options?.options)
  const ops = promisify(client)

  // For tag-based invalidation, we store tag -> keys mapping
  const getTagKey = (tag: string): string => `${keyPrefix}_tag:${tag}`

  client.on('failure', (details) => {
    logger.error('Memcached failure:', details)
  })

  client.on('reconnecting', (details) => {
    logger.debug('Memcached reconnecting:', details)
  })

  return {
    async get<T = unknown>(key: string): Promise<T | undefined> {
      const fullKey = keyPrefix + key
      try {
        const data = await ops.get<string>(fullKey)
        if (data === undefined) return undefined
        try {
          return JSON.parse(data) as T
        } catch (_error) {
          // data is not JSON-serialized; return as-is (e.g. a plain string value)
          return data as unknown as T
        }
      } catch (error) {
        logger.error('Memcached get error:', error)
        return undefined
      }
    },

    async set<T = unknown>(key: string, value: T, cacheOptions?: CacheOptions): Promise<void> {
      const fullKey = keyPrefix + key
      const serialized = JSON.stringify(value)
      const ttl = cacheOptions?.ttl ?? 0 // 0 = no expiration

      try {
        await ops.set(fullKey, serialized, toMemcachedLifetime(ttl))

        // Track tags
        if (cacheOptions?.tags) {
          for (const tag of cacheOptions.tags) {
            const tagKey = getTagKey(tag)
            const existingKeys = await ops.get<string>(tagKey)
            const keys = existingKeys ? (JSON.parse(existingKeys) as string[]) : []
            if (!keys.includes(fullKey)) {
              keys.push(fullKey)
              await ops.set(tagKey, JSON.stringify(keys), 0)
            }
          }
        }
      } catch (error) {
        logger.error('Memcached set error:', error)
        throw error
      }
    },

    async delete(key: string): Promise<boolean> {
      const fullKey = keyPrefix + key
      try {
        return await ops.del(fullKey)
      } catch (error) {
        logger.error('Memcached delete error:', error)
        return false
      }
    },

    async has(key: string): Promise<boolean> {
      const fullKey = keyPrefix + key
      try {
        const value = await ops.get(fullKey)
        return value !== undefined
      } catch (_error) {
        // Memcached error treated as a cache miss; safe to return false
        return false
      }
    },

    async getMany<T = unknown>(keys: string[]): Promise<Map<string, T>> {
      const results = new Map<string, T>()
      if (keys.length === 0) return results

      const fullKeys = keys.map((k) => keyPrefix + k)
      try {
        const data = await ops.getMulti<string>(fullKeys)
        for (const [fullKey, value] of Object.entries(data)) {
          const key = fullKey.slice(keyPrefix.length)
          try {
            results.set(key, JSON.parse(value) as T)
          } catch (_error) {
            // value is not JSON-serialized; store as-is (e.g. a plain string value)
            results.set(key, value as unknown as T)
          }
        }
      } catch (error) {
        logger.error('Memcached getMany error:', error)
      }
      return results
    },

    async setMany<T = unknown>(
      entries: Array<[string, T]>,
      cacheOptions?: CacheOptions,
    ): Promise<void> {
      for (const [key, value] of entries) {
        await this.set(key, value, cacheOptions)
      }
    },

    async deleteMany(keys: string[]): Promise<number> {
      let count = 0
      for (const key of keys) {
        const deleted = await this.delete(key)
        if (deleted) count++
      }
      return count
    },

    async invalidateTag(tag: string): Promise<void> {
      const tagKey = getTagKey(tag)
      try {
        const existingKeys = await ops.get<string>(tagKey)
        if (existingKeys) {
          const keys = JSON.parse(existingKeys) as string[]
          for (const key of keys) {
            await ops.del(key)
          }
        }
        await ops.del(tagKey)
      } catch (error) {
        logger.error('Memcached invalidateTag error:', error)
      }
    },

    async clear(): Promise<void> {
      try {
        await ops.flush()
      } catch (error) {
        logger.error('Memcached clear error:', error)
        throw error
      }
    },

    async close(): Promise<void> {
      ops.end()
    },

    async getOrSet<T = unknown>(
      key: string,
      factory: () => Promise<T>,
      cacheOptions?: CacheOptions,
    ): Promise<T> {
      const cached = await this.get<T>(key)
      if (cached !== undefined) return cached

      const value = await factory()
      await this.set(key, value, cacheOptions)
      return value
    },
  }
}

/**
 * The default Memcached provider instance.
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
