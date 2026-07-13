/**
 * Memcached cache provider for molecule.dev.
 *
 * @remarks
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
 * @see https://www.npmjs.com/package/memcached
 *
 * @module
 */

export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
