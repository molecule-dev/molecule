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
 * How long (ms) the in-process cache-namespace version is trusted before
 * re-reading it from memcached. Bounds how long a `clear()` issued by ANOTHER
 * process sharing this memcached server takes to be picked up here.
 */
const VERSION_CACHE_TTL_MS = 30_000

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
 * alongside cached values, and a namespace-versioned `clear()` (memcached has
 * no key-enumeration command, so a scoped-delete flush is not possible directly).
 *
 * @param options - Memcached connection and behavior options (servers, host, port, key prefix).
 * @returns A `CacheProvider` backed by Memcached.
 */
export const createProvider = (options?: MemcachedOptions): CacheProvider => {
  // Explicit config beats ambient env: a caller passing host/port must not
  // have them silently overridden by a MEMCACHED_SERVERS that happens to be
  // set in the environment — env vars only fill in what the call site left
  // unspecified.
  const hasExplicitTarget = options?.host !== undefined || options?.port !== undefined
  const servers =
    options?.servers ??
    (hasExplicitTarget
      ? `${options.host ?? process.env.MEMCACHED_HOST ?? 'localhost'}:${options.port ?? process.env.MEMCACHED_PORT ?? '11211'}`
      : (process.env.MEMCACHED_SERVERS?.split(',') ??
        `${process.env.MEMCACHED_HOST ?? 'localhost'}:${process.env.MEMCACHED_PORT ?? '11211'}`))

  const keyPrefix = options?.keyPrefix ?? 'molecule:'
  const client = new Memcached(servers, options?.options)
  const ops = promisify(client)

  client.on('failure', (details) => {
    logger.error('Memcached failure:', details)
  })

  client.on('reconnecting', (details) => {
    logger.debug('Memcached reconnecting:', details)
  })

  // --- Namespace-versioned clear() -------------------------------------------
  //
  // Memcached has no SCAN/key-enumeration command, so `clear()` cannot delete
  // "only this provider's keys" the way the Redis bond does (SCAN + UNLINK by
  // prefix). Instead every key is written under `<keyPrefix>v<N>:`, where N is
  // stored at the well-known key `<keyPrefix>__version__`. `clear()` atomically
  // increments N: every key from the previous generation becomes permanently
  // UNREACHABLE under the new prefix (never deleted immediately — it is
  // reclaimed later by memcached's normal LRU eviction) and this NEVER touches
  // another app's keys sharing the same memcached server (unlike `flush_all`).
  const versionKey = `${keyPrefix}__version__`
  let versionCache: { value: number; fetchedAt: number } | null = null

  const fetchVersion = async (): Promise<number> => {
    try {
      const raw = await ops.get<string>(versionKey)
      if (raw !== undefined) {
        const parsed = parseInt(raw, 10)
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
      }
      // First use anywhere against this keyPrefix: seed version 1. `add` is a
      // race-safe no-op if another process already created it first.
      await ops.add(versionKey, '1', 0)
      return 1
    } catch (error) {
      logger.error('Memcached version-key read error — falling back to version 1:', error)
      return 1
    }
  }

  const getVersion = async (): Promise<number> => {
    const now = Date.now()
    if (versionCache && now - versionCache.fetchedAt < VERSION_CACHE_TTL_MS) {
      return versionCache.value
    }
    const value = await fetchVersion()
    versionCache = { value, fetchedAt: now }
    return value
  }

  const getEffectivePrefix = async (): Promise<string> => `${keyPrefix}v${await getVersion()}:`

  // --- Tag tracking ------------------------------------------------------------
  //
  // `<prefix>_tag:<tag>` stores a newline-delimited log of full keys carrying
  // that tag. Additions use memcached's atomic APPEND (falling back to ADD to
  // create the key), so two concurrent tagged `set()` calls can never silently
  // drop each other's key — the failure mode a plain read-JSON-modify-write
  // would have. Removal (on `delete()` or a re-`set()` that drops a tag) still
  // needs a read-modify-write, since memcached has no "remove one array
  // member" primitive — see module @remarks for the residual race this leaves.
  //
  // `<prefix>_tags:<key>` is the reverse index: which tags a KEY currently
  // carries, written as a single overwrite (safe: only concurrent writers of
  // the SAME key can race it, and last-write-wins is already this cache's
  // accepted semantics for a key's own value). It lets `set()`/`delete()`
  // detach a key from exactly its OLD tags without knowing the tag names in
  // advance, so `invalidateTag()` never deletes a key re-set WITHOUT the tag.
  const getTagKey = (prefix: string, tag: string): string => `${prefix}_tag:${tag}`
  const getTagsIndexKey = (prefix: string, key: string): string => `${prefix}_tags:${key}`

  const addToTagLog = async (tagKey: string, member: string): Promise<void> => {
    const appended = await ops.append(tagKey, `${member}\n`)
    if (appended) return
    const created = await ops.add(tagKey, `${member}\n`, 0)
    if (!created) {
      // Lost the create race to another process — the key exists now, so the
      // append that failed above is guaranteed to succeed this time.
      await ops.append(tagKey, `${member}\n`)
    }
  }

  const removeFromTagLog = async (tagKey: string, member: string): Promise<void> => {
    const raw = await ops.get<string>(tagKey)
    if (raw === undefined) return
    const members = raw.split('\n').filter((line) => line.length > 0 && line !== member)
    if (members.length > 0) {
      await ops.set(tagKey, `${members.join('\n')}\n`, 0)
    } else {
      await ops.del(tagKey)
    }
  }

  /**
   * Detaches `key` from every tag it is CURRENTLY recorded under (per its
   * reverse index) and drops the reverse index entry itself.
   */
  const detachTags = async (prefix: string, key: string): Promise<void> => {
    const tagsIndexKey = getTagsIndexKey(prefix, key)
    const raw = await ops.get<string>(tagsIndexKey)
    if (raw === undefined) return
    const tags = raw.split('\n').filter((tag) => tag.length > 0)
    if (tags.length === 0) return
    const fullKey = prefix + key
    await Promise.all(tags.map((tag) => removeFromTagLog(getTagKey(prefix, tag), fullKey)))
    await ops.del(tagsIndexKey)
  }

  return {
    async get<T = unknown>(key: string): Promise<T | undefined> {
      const prefix = await getEffectivePrefix()
      const fullKey = prefix + key
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
      const prefix = await getEffectivePrefix()
      const fullKey = prefix + key
      const serialized = JSON.stringify(value)
      const ttl = cacheOptions?.ttl ?? 0 // 0 = no expiration
      const lifetime = toMemcachedLifetime(ttl)

      try {
        // A re-set must REPLACE this key's tag memberships, not accumulate
        // them — detach from whatever a prior set() attached before applying
        // the new tags (fixes invalidateTag() acting on stale membership).
        await detachTags(prefix, key)

        await ops.set(fullKey, serialized, lifetime)

        if (cacheOptions?.tags && cacheOptions.tags.length > 0) {
          await Promise.all(
            cacheOptions.tags.map((tag) => addToTagLog(getTagKey(prefix, tag), fullKey)),
          )
          await ops.set(getTagsIndexKey(prefix, key), `${cacheOptions.tags.join('\n')}\n`, lifetime)
        }
      } catch (error) {
        logger.error('Memcached set error:', error)
        throw error
      }
    },

    async delete(key: string): Promise<boolean> {
      const prefix = await getEffectivePrefix()
      const fullKey = prefix + key
      try {
        await detachTags(prefix, key)
        return await ops.del(fullKey)
      } catch (error) {
        logger.error('Memcached delete error:', error)
        return false
      }
    },

    async has(key: string): Promise<boolean> {
      const prefix = await getEffectivePrefix()
      const fullKey = prefix + key
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

      const prefix = await getEffectivePrefix()
      const fullKeys = keys.map((k) => prefix + k)
      try {
        const data = await ops.getMulti<string>(fullKeys)
        for (const [fullKey, value] of Object.entries(data)) {
          const key = fullKey.slice(prefix.length)
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
      const prefix = await getEffectivePrefix()
      const tagKey = getTagKey(prefix, tag)
      try {
        const raw = await ops.get<string>(tagKey)
        if (raw !== undefined) {
          const members = raw.split('\n').filter((line) => line.length > 0)
          for (const fullKey of members) {
            await ops.del(fullKey)
          }
        }
        await ops.del(tagKey)
      } catch (error) {
        logger.error('Memcached invalidateTag error:', error)
      }
    },

    async clear(): Promise<void> {
      try {
        // Ensure the well-known version key exists before incrementing it.
        await getVersion()
        const incremented = await ops.incr(versionKey, 1)
        if (typeof incremented === 'number') {
          versionCache = { value: incremented, fetchedAt: Date.now() }
        } else {
          // Rare: the version key vanished between getVersion() and incr()
          // (e.g. evicted under memory pressure). Reseed at a version
          // guaranteed to be new so we never reuse an old generation's prefix.
          const fallback = (versionCache?.value ?? 1) + 1
          await ops.add(versionKey, String(fallback), 0)
          versionCache = { value: fallback, fetchedAt: Date.now() }
        }
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
