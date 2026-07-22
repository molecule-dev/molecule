/**
 * Provider-agnostic caching interface for molecule.dev.
 *
 * Defines the `CacheProvider` interface for key-value caching with TTL, tags,
 * batch operations, and cache-aside (`getOrSet`). Bond packages (Redis, Memcached,
 * in-memory, etc.) implement this interface. Application code uses the convenience
 * functions (`get`, `set`, `del`, `has`, `getOrSet`) which delegate to the bonded provider.
 *
 * @remarks
 * - **Pick the provider by what is actually PROVISIONED (read this FIRST).** The bond you
 *   `setProvider()` is the ONLY thing that decides whether a managed server is required.
 *   `@molecule/api-cache-memory` is in-process and needs NOTHING — use it whenever no managed
 *   cache is provisioned: a fresh sandbox, a single-process app, or when you are ADDING caching
 *   to an app that did not already use Redis/Memcached. Use `-redis` / `-memcached` ONLY when a
 *   managed instance actually exists — i.e. its connection URL is present in the environment
 *   (`REDIS_URL`, etc.). Wiring `-redis` with no `REDIS_URL` compiles and can even let a
 *   memory-backed TEST pass, but the RUNNING app's cache then fails to connect (localhost:6379
 *   refused) — a green test hiding a broken runtime. If durable/shared caching is genuinely
 *   needed and none is provisioned, ASK the user to connect one; do not assume it is there.
 * The cache is BEST-EFFORT and often SHARED across users — treat it accordingly:
 * - **A per-user value MUST include the user id in its KEY** (`user:123:profile`, not
 *   `profile`). A shared key for per-user data leaks one user's data to another — a real
 *   cross-user data breach, not just a bug.
 * - **Never rely on the cache for correctness or authorization.** It can be empty, evicted, or
 *   stale — re-check ownership on the real data, and make the `getOrSet` loader carry the SAME
 *   ownership scope as a normal query.
 * - **Invalidate on write.** After updating the underlying record, `del()` (or re-`set()`) its
 *   key, or reads keep serving stale data.
 * - **`undefined` means "not cached" — you cannot cache `undefined`** (cache `null` instead).
 *   `get()` returns `undefined` for a miss, so a `getOrSet` factory that resolves to
 *   `undefined` is never treated as cached and will re-run on EVERY call.
 * - `getOrSet` does not lock: concurrent misses on the same key each run the factory
 *   (last write wins). Fine for idempotent loaders; don't put side-effecting work in one.
 * - Don't cache a raw secret; cache derived, non-sensitive data.
 * - **`clear()` must be scoped to the bonded provider's own namespace, never a shared
 *   store.** A conformant `CacheProvider.clear()` implementation removes ONLY keys it
 *   created (its `keyPrefix`/namespace) — it must NEVER issue a database-wide flush
 *   (Redis `FLUSHDB`/`FLUSHALL`, Memcached `flush_all`) that would also wipe sessions,
 *   queues, rate limiters, or another app's data sharing the same store. See
 *   `@molecule/api-cache-redis` (`SCAN` + batched `UNLINK` by `keyPrefix`) and
 *   `@molecule/api-cache-memcached` (namespace versioning, since Memcached has no
 *   key-enumeration command to scope a delete) for the two canonical strategies —
 *   implement whichever fits a new provider's capabilities, but never the raw flush.
 *
 * @example
 * ```typescript
 * import { setProvider, get, set, getOrSet } from '@molecule/api-cache'
 * // Pick the bond by what's provisioned — in-memory needs nothing (safe default); swap to
 * // `@molecule/api-cache-redis` ONLY when a managed Redis exists (REDIS_URL is in the env).
 * import { createProvider } from '@molecule/api-cache-memory'
 *
 * setProvider(createProvider())
 * await set('user:123', userData, { ttl: 3600 })
 * const cached = await get<UserData>('user:123')
 * const fresh = await getOrSet('user:456', () => fetchUser('456'), { ttl: 600 })
 * ```
 *
 * @e2e
 * Integration checklist — exercise the REAL behavior end-to-end (drive the app
 * action that reads/writes this cache in the live preview, no mocks), adapt each
 * item to this app's actual screens/flows, and check every box off one by one. A
 * box you can't check is an integration bug to fix — not a skip:
 * - [ ] `getOrSet(key, factory, options)` computes ONCE on a miss and serves the
 *   cached copy afterward: drive the same screen/endpoint twice within
 *   `CacheOptions.ttl` and confirm the expensive factory (DB/upstream call) runs
 *   only on the FIRST load — the second read returns the cached value without
 *   re-running it.
 * - [ ] `set(key, value)` then `get<T>(key)` round-trips the same value back into
 *   the app (the cached data renders identically to the source data).
 * - [ ] Deletion reflects a miss: after `delete(key)`, `has(key)` is `false` and
 *   `get(key)` returns `undefined`, so the app recomputes fresh from source
 *   instead of serving the removed entry.
 * - [ ] TTL expiry refetches: once `CacheOptions.ttl` seconds elapse, the next
 *   read recomputes fresh data — a stale value is NEVER served past its TTL.
 * - [ ] A write that changes the underlying record invalidates its key (via
 *   `delete()` or a re-`set()`) so the very next read reflects the change — the app
 *   never serves a stale cached copy after an update.
 * - [ ] AUTHORIZATION: a per-user or per-tenant value is cached under a key that
 *   INCLUDES the user/tenant id (`user:123:profile`, never a global `profile`).
 *   Load user A's data, then user B's — B must receive B's own data, never A's
 *   cached copy. A shared key for per-user data is a cross-user data leak, not an
 *   optimization.
 * - [ ] A cache backend failure or miss DEGRADES to computing from source: the
 *   request still succeeds (getProvider()/get() unavailable falls back to the
 *   real query) rather than erroring the whole request.
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
