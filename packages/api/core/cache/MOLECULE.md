# @molecule/api-cache

Provider-agnostic caching interface for molecule.dev.

Defines the `CacheProvider` interface for key-value caching with TTL, tags,
batch operations, and cache-aside (`getOrSet`). Bond packages (Redis, Memcached,
in-memory, etc.) implement this interface. Application code uses the convenience
functions (`get`, `set`, `del`, `has`, `getOrSet`) which delegate to the bonded provider.

## Quick Start

```typescript
import { setProvider, get, set, getOrSet } from '@molecule/api-cache'
// Pick the bond by what's provisioned — in-memory needs nothing (safe default); swap to
// `@molecule/api-cache-redis` ONLY when a managed Redis exists (REDIS_URL is in the env).
import { createProvider } from '@molecule/api-cache-memory'

setProvider(createProvider())
await set('user:123', userData, { ttl: 3600 })
const cached = await get<UserData>('user:123')
const fresh = await getOrSet('user:456', () => fetchUser('456'), { ttl: 600 })
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-cache @molecule/api-bond @molecule/api-i18n
```

## API

### Interfaces

#### `CacheOptions`

Cache entry options.

```typescript
interface CacheOptions {
  /**
   * Time-to-live in seconds.
   */
  ttl?: number

  /**
   * Tags for cache invalidation.
   */
  tags?: string[]
}
```

#### `CacheProvider`

Cache provider interface.

All cache providers must implement this interface.

```typescript
interface CacheProvider {
  /**
   * Gets a value from the cache.
   *
   * @param key - Cache key
   */
  get<T = unknown>(key: string): Promise<T | undefined>

  /**
   * Sets a value in the cache.
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param options - Cache options (ttl, tags)
   */
  set<T = unknown>(key: string, value: T, options?: CacheOptions): Promise<void>

  /**
   * Deletes a value from the cache.
   *
   * @param key - Cache key
   * @returns true if the key existed and was deleted
   */
  delete(key: string): Promise<boolean>

  /**
   * Checks if a key exists in the cache.
   *
   * @param key - Cache key
   */
  has(key: string): Promise<boolean>

  /**
   * Gets multiple values from the cache.
   *
   * @param keys - Array of cache keys
   */
  getMany?<T = unknown>(keys: string[]): Promise<Map<string, T>>

  /**
   * Sets multiple values in the cache.
   *
   * @param entries - Array of [key, value] pairs
   * @param options - Cache options applied to all entries
   */
  setMany?<T = unknown>(entries: Array<[string, T]>, options?: CacheOptions): Promise<void>

  /**
   * Deletes multiple values from the cache.
   *
   * @param keys - Array of cache keys
   */
  deleteMany?(keys: string[]): Promise<number>

  /**
   * Invalidates all cache entries with the given tag.
   *
   * @param tag - Tag to invalidate
   */
  invalidateTag?(tag: string): Promise<void>

  /**
   * Clears all cache entries.
   */
  clear?(): Promise<void>

  /**
   * Closes the cache connection.
   */
  close?(): Promise<void>

  /**
   * Gets or sets a value using a factory function.
   *
   * @param key - Cache key
   * @param factory - Function to generate the value if not cached
   * @param options - Cache options
   */
  getOrSet?<T = unknown>(key: string, factory: () => Promise<T>, options?: CacheOptions): Promise<T>
}
```

### Functions

#### `del(key)`

Deletes a cached value by key.

```typescript
function del(key: string): Promise<boolean>
```

- `key` — The cache key to delete.

**Returns:** `true` if the key existed and was deleted, `false` otherwise.

#### `get(key)`

Retrieves a cached value by key, or `undefined` if not found or expired.

```typescript
function get(key: string): Promise<T | undefined>
```

- `key` — The cache key to look up.

**Returns:** The cached value cast to `T`, or `undefined` if not found.

#### `getOrSet(key, factory, options)`

Cache-aside helper: returns the cached value if it exists, otherwise calls
the factory function, caches the result, and returns it. Uses the provider's
native `getOrSet` if available, otherwise falls back to a `get` + `set` sequence.

```typescript
function getOrSet(key: string, factory: () => Promise<T>, options?: CacheOptions): Promise<T>
```

- `key` — The cache key.
- `factory` — Async function that produces the value when cache misses.
- `options` — Optional TTL and tags for the cached entry.

**Returns:** The cached or freshly-computed value.

#### `getProvider()`

Retrieves the bonded cache provider, throwing if none is configured.

```typescript
function getProvider(): CacheProvider
```

**Returns:** The bonded cache provider.

#### `has(key)`

Checks whether a key exists in the cache.

```typescript
function has(key: string): Promise<boolean>
```

- `key` — The cache key to check.

**Returns:** `true` if the key exists in the cache.

#### `hasProvider()`

Checks whether a cache provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a cache provider is bonded.

#### `set(key, value, options)`

Stores a value in the cache under the given key, with optional TTL and tags.

```typescript
function set(key: string, value: T, options?: CacheOptions): Promise<void>
```

- `key` — The cache key.
- `value` — The value to store.
- `options` — Optional TTL in seconds and tags for invalidation.

**Returns:** A promise that resolves when the value has been stored.

#### `setProvider(provider)`

Registers a cache provider as the active singleton. Called by bond
packages during application startup.

```typescript
function setProvider(provider: CacheProvider): void
```

- `provider` — The cache provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| Memcached | `@molecule/api-cache-memcached` |
| In-memory (no persistence) | `@molecule/api-cache-memory` |
| Redis | `@molecule/api-cache-redis` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-i18n`

- **Pick the provider by what is actually PROVISIONED (read this FIRST).** The bond you
  `setProvider()` is the ONLY thing that decides whether a managed server is required.
  `@molecule/api-cache-memory` is in-process and needs NOTHING — use it whenever no managed
  cache is provisioned: a fresh sandbox, a single-process app, or when you are ADDING caching
  to an app that did not already use Redis/Memcached. Use `-redis` / `-memcached` ONLY when a
  managed instance actually exists — i.e. its connection URL is present in the environment
  (`REDIS_URL`, etc.). Wiring `-redis` with no `REDIS_URL` compiles and can even let a
  memory-backed TEST pass, but the RUNNING app's cache then fails to connect (localhost:6379
  refused) — a green test hiding a broken runtime. If durable/shared caching is genuinely
  needed and none is provisioned, ASK the user to connect one; do not assume it is there.
The cache is BEST-EFFORT and often SHARED across users — treat it accordingly:
- **A per-user value MUST include the user id in its KEY** (`user:123:profile`, not
  `profile`). A shared key for per-user data leaks one user's data to another — a real
  cross-user data breach, not just a bug.
- **Never rely on the cache for correctness or authorization.** It can be empty, evicted, or
  stale — re-check ownership on the real data, and make the `getOrSet` loader carry the SAME
  ownership scope as a normal query.
- **Invalidate on write.** After updating the underlying record, `del()` (or re-`set()`) its
  key, or reads keep serving stale data.
- **`undefined` means "not cached" — you cannot cache `undefined`** (cache `null` instead).
  `get()` returns `undefined` for a miss, so a `getOrSet` factory that resolves to
  `undefined` is never treated as cached and will re-run on EVERY call.
- `getOrSet` does not lock: concurrent misses on the same key each run the factory
  (last write wins). Fine for idempotent loaders; don't put side-effecting work in one.
- Don't cache a raw secret; cache derived, non-sensitive data.
- **`clear()` must be scoped to the bonded provider's own namespace, never a shared
  store.** A conformant `CacheProvider.clear()` implementation removes ONLY keys it
  created (its `keyPrefix`/namespace) — it must NEVER issue a database-wide flush
  (Redis `FLUSHDB`/`FLUSHALL`, Memcached `flush_all`) that would also wipe sessions,
  queues, rate limiters, or another app's data sharing the same store. See
  `@molecule/api-cache-redis` (`SCAN` + batched `UNLINK` by `keyPrefix`) and
  `@molecule/api-cache-memcached` (namespace versioning, since Memcached has no
  key-enumeration command to scope a delete) for the two canonical strategies —
  implement whichever fits a new provider's capabilities, but never the raw flush.

## E2E Tests

Integration checklist — exercise the REAL behavior end-to-end (drive the app
action that reads/writes this cache in the live preview, no mocks), adapt each
item to this app's actual screens/flows, and check every box off one by one. A
box you can't check is an integration bug to fix — not a skip:
- [ ] `getOrSet(key, factory, options)` computes ONCE on a miss and serves the
  cached copy afterward: drive the same screen/endpoint twice within
  `CacheOptions.ttl` and confirm the expensive factory (DB/upstream call) runs
  only on the FIRST load — the second read returns the cached value without
  re-running it.
- [ ] `set(key, value)` then `get<T>(key)` round-trips the same value back into
  the app (the cached data renders identically to the source data).
- [ ] Deletion reflects a miss: after `del(key)`, `has(key)` is `false` and
  `get(key)` returns `undefined`, so the app recomputes fresh from source
  instead of serving the removed entry.
- [ ] TTL expiry refetches: once `CacheOptions.ttl` seconds elapse, the next
  read recomputes fresh data — a stale value is NEVER served past its TTL.
- [ ] A write that changes the underlying record invalidates its key (via
  `del()` or a re-`set()`) so the very next read reflects the change — the app
  never serves a stale cached copy after an update.
- [ ] AUTHORIZATION: a per-user or per-tenant value is cached under a key that
  INCLUDES the user/tenant id (`user:123:profile`, never a global `profile`).
  Load user A's data, then user B's — B must receive B's own data, never A's
  cached copy. A shared key for per-user data is a cross-user data leak, not an
  optimization.
- [ ] A cache backend failure or miss DEGRADES to computing from source: the
  request still succeeds (getProvider()/get() unavailable falls back to the
  real query) rather than erroring the whole request.

## Translations

Translation strings are provided by `@molecule/api-locales-cache`.
