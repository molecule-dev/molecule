/**
 * Redis cache provider for molecule.dev.
 *
 * @remarks
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
 * @see https://www.npmjs.com/package/ioredis
 *
 * @module
 */

export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
