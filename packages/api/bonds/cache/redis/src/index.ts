/**
 * Redis cache provider for molecule.dev.
 *
 * @remarks
 * - **Wire it through the core** (`setProvider(createProvider({...}))` from `@molecule/api-cache`),
 *   not `bond('cache-redis', ...)`. The core delete function is `del()` (not `delete()`).
 * - **`ttl` is SECONDS** (`SETEX`); `commandTimeout` is milliseconds. No `ttl` = no expiry.
 * - With no `url`, no `REDIS_URL` and no `host`, it connects to `localhost:6379` — in a deployed
 *   app with no Redis that means every write hangs/retries. Use `@molecule/api-cache-memory` when
 *   no Redis is provisioned.
 * - **Explicit config beats ambient env.** `createProvider({ host, port, ... })` connects
 *   to exactly that server even when `REDIS_URL` is set in the environment — env vars
 *   only fill in options the call site left unspecified.
 * - **`clear()` scans and deletes only keys under this provider's `keyPrefix`**
 *   (`SCAN MATCH <keyPrefix>*` + batched `UNLINK`) — it never runs `FLUSHDB`/`FLUSHALL`,
 *   so it is safe to call on a Redis db shared with sessions, `@molecule/api-cron-bullmq`
 *   queues, or rate-limit counters from other apps.
 * - **Reads degrade like a cache miss; writes still throw.** `get()`/`has()`/`getMany()`
 *   catch Redis/connection errors, log them, and return `undefined`/`false`/an empty map
 *   (matching `@molecule/api-cache-memcached`'s read behavior) — check the logs to tell a
 *   down Redis apart from a real miss. `set()`/`delete()`/`clear()` still throw: a write
 *   failure must be visible to the caller, it can't silently look like "nothing to cache."
 * - **When Redis is unreachable, commands do not fail fast by default** — ioredis queues
 *   them offline and retries (default `maxRetriesPerRequest: 20`, ~10s+ per command)
 *   before rejecting. Pass `maxRetriesPerRequest`, `enableOfflineQueue`, and/or
 *   `commandTimeout` to `createProvider(options)` to bound this (e.g.
 *   `{ maxRetriesPerRequest: 1, commandTimeout: 2000 }` surfaces a down Redis in ~2s
 *   instead of 10s+); they are forwarded to the underlying ioredis client unchanged.
 * - **Tag membership stays exact, not "ever-tagged":** `_tag:<tag>` Redis SETs are kept in
 *   sync via a reverse index (`_tags:<key>`), so `delete()`/`deleteMany()` and a re-`set()`
 *   that drops or changes a key's tags both `SREM` it out of its OLD tag sets first —
 *   `invalidateTag()` never deletes a key that no longer carries that tag. The tag SETs
 *   themselves are still stored WITHOUT a TTL and are only cleared by `invalidateTag()` or
 *   `clear()` (a tagged key that merely expires leaves its tag membership until then).
 *
 * @example
 * ```typescript
 * import { del, get, getOrSet, set, setProvider } from '@molecule/api-cache'
 * import { createProvider } from '@molecule/api-cache-redis'
 *
 * // Startup: use this bond ONLY when a managed Redis is provisioned (REDIS_URL in the env).
 * const cache = createProvider({
 *   url: process.env.REDIS_URL, // e.g. rediss://redis.example.com:6380
 *   keyPrefix: 'myapp:', // default 'molecule:'
 *   maxRetriesPerRequest: 1, // fail fast instead of ioredis' ~10s+ offline retries
 *   commandTimeout: 2000, // ms
 * })
 * setProvider(cache)
 *
 * await set('user:123:profile', { name: 'Ada' }, { ttl: 3600 }) // ttl is SECONDS
 * const profile = await get<{ name: string }>('user:123:profile') // { name: 'Ada' }
 *
 * // Cache-aside: the loader runs on a miss only.
 * const stats = await getOrSet('stats:daily', async () => ({ visits: 42 }), { ttl: 600 })
 *
 * await del('user:123:profile')
 *
 * // Graceful shutdown: release the Redis connection.
 * process.on('SIGTERM', () => void cache.close?.())
 * ```
 *
 * @see https://www.npmjs.com/package/ioredis
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
