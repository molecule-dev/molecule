/**
 * Memcached cache provider for molecule.dev.
 *
 * @remarks
 * - **Wire it through the core** (`setProvider(createProvider({...}))` from `@molecule/api-cache`),
 *   not `bond('cache-memcached', ...)`. The core delete function is `del()` (not `delete()`).
 * - With no `servers`, `host`/`port` or `MEMCACHED_*` env it connects to `localhost:11211`. Use
 *   `@molecule/api-cache-memory` when no memcached is provisioned. No `ttl` = no expiry.
 * - **Explicit config beats ambient env.** `createProvider({ host, port })` connects to
 *   exactly that server even when `MEMCACHED_SERVERS` is set in the environment — env
 *   vars only fill in options the call site left unspecified.
 * - `ttl` always means "seconds from now": TTLs beyond memcached's 30-day relative limit
 *   are converted to the absolute unix timestamp the protocol expects (a raw value over
 *   2592000s would otherwise be read as a 1970s timestamp and expire immediately).
 * - **Reads are best-effort:** if the memcached server is unreachable, `get()`/`has()`
 *   log the error and return `undefined`/`false` — indistinguishable from a cache miss
 *   at the call site (check the logs). Writes (`set`/`clear`) throw instead.
 * - Memcached keys must be ≤250 characters with no spaces or control characters
 *   (including the `molecule:` prefix this provider prepends); violating keys error.
 * - **`clear()` uses namespace versioning, not a real flush.** Memcached has no
 *   `SCAN`/key-enumeration command, so there is no way to delete only this provider's
 *   keys directly (unlike the Redis bond's `SCAN`+`UNLINK`). Every key is written under
 *   `<keyPrefix>v<N>:`; `clear()` atomically increments `N` (stored at the well-known key
 *   `<keyPrefix>__version__`) so every key from the previous generation becomes
 *   permanently UNREACHABLE — it is NOT deleted immediately and still occupies memory
 *   until memcached's normal LRU eviction reclaims it. This never touches another app's
 *   keys sharing the same memcached server (unlike a raw `flush_all`). The current
 *   version is cached in-process for up to 30s, so a `clear()` issued by ANOTHER process
 *   is picked up here within that window, not instantly.
 * - **Tag invalidation is best-effort ("ever-tagged"), not guaranteed exact,** because
 *   memcached has no native set type: `_tag:<tag>` is a newline-delimited log of keys,
 *   appended to atomically (safe under concurrent tagged `set()` calls) but PRUNED with a
 *   read-modify-write on `delete()`/a re-`set()` without the tag — two concurrent
 *   removals from the SAME tag can still race and leave a stale entry (harmless:
 *   `invalidateTag()` deleting an already-gone key is a no-op). If exact tag membership
 *   matters, use the Redis bond instead (native `SADD`/`SREM`).
 *
 * @example
 * ```typescript
 * import { del, get, getOrSet, set, setProvider } from '@molecule/api-cache'
 * import { createProvider } from '@molecule/api-cache-memcached'
 *
 * // Startup: use this bond ONLY when a memcached server is provisioned (MEMCACHED_SERVERS).
 * const cache = createProvider({
 *   servers: process.env.MEMCACHED_SERVERS?.split(','), // e.g. 'cache-1:11211,cache-2:11211'
 *   keyPrefix: 'myapp:', // default 'molecule:'
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
 * // Graceful shutdown: close the memcached connections.
 * process.on('SIGTERM', () => void cache.close?.())
 * ```
 *
 * @see https://www.npmjs.com/package/memcached
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
