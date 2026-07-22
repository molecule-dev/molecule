# @molecule/api-cache-redis

Redis cache provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-cache-redis @molecule/api-bond @molecule/api-cache @molecule/api-secrets ioredis
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
    ttl?: number;
    /**
     * Tags for cache invalidation.
     */
    tags?: string[];
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
    get<T = unknown>(key: string): Promise<T | undefined>;
    /**
     * Sets a value in the cache.
     *
     * @param key - Cache key
     * @param value - Value to cache
     * @param options - Cache options (ttl, tags)
     */
    set<T = unknown>(key: string, value: T, options?: CacheOptions): Promise<void>;
    /**
     * Deletes a value from the cache.
     *
     * @param key - Cache key
     * @returns true if the key existed and was deleted
     */
    delete(key: string): Promise<boolean>;
    /**
     * Checks if a key exists in the cache.
     *
     * @param key - Cache key
     */
    has(key: string): Promise<boolean>;
    /**
     * Gets multiple values from the cache.
     *
     * @param keys - Array of cache keys
     */
    getMany?<T = unknown>(keys: string[]): Promise<Map<string, T>>;
    /**
     * Sets multiple values in the cache.
     *
     * @param entries - Array of [key, value] pairs
     * @param options - Cache options applied to all entries
     */
    setMany?<T = unknown>(entries: Array<[string, T]>, options?: CacheOptions): Promise<void>;
    /**
     * Deletes multiple values from the cache.
     *
     * @param keys - Array of cache keys
     */
    deleteMany?(keys: string[]): Promise<number>;
    /**
     * Invalidates all cache entries with the given tag.
     *
     * @param tag - Tag to invalidate
     */
    invalidateTag?(tag: string): Promise<void>;
    /**
     * Clears all cache entries.
     */
    clear?(): Promise<void>;
    /**
     * Closes the cache connection.
     */
    close?(): Promise<void>;
    /**
     * Gets or sets a value using a factory function.
     *
     * @param key - Cache key
     * @param factory - Function to generate the value if not cached
     * @param options - Cache options
     */
    getOrSet?<T = unknown>(key: string, factory: () => Promise<T>, options?: CacheOptions): Promise<T>;
}
```

#### `RedisOptions`

Options for creating a Redis cache provider.

```typescript
interface RedisOptions {
  url?: string
  host?: string
  port?: number
  password?: string
  db?: number
  keyPrefix?: string
  /**
   * Maximum retry attempts for a command before ioredis rejects it instead of
   * continuing to retry. Forwarded to ioredis unchanged; omitted/`undefined`
   * keeps ioredis' own default (`20`, each attempt backing off up to 2s — a
   * down Redis can therefore take 10s+ to surface as an error). Pass a small
   * value (e.g. `1`) for fail-fast cache semantics.
   */
  maxRetriesPerRequest?: number
  /**
   * Whether ioredis queues commands issued while disconnected instead of
   * rejecting them immediately. Forwarded to ioredis unchanged; omitted keeps
   * ioredis' own default (`true`). Set to `false` for fail-fast cache
   * semantics — commands reject immediately instead of buffering.
   */
  enableOfflineQueue?: boolean
  /**
   * Milliseconds to wait for a command's reply before ioredis times it out.
   * Forwarded to ioredis unchanged; omitted keeps ioredis' own default (no
   * timeout). Set a bounded value (e.g. `2000`) to cap the worst-case stall
   * from an unreachable-but-connected Redis.
   */
  commandTimeout?: number
}
```

### Functions

#### `createClient(options)`

Creates a raw ioredis `Redis` client for direct API access,
bypassing the `CacheProvider` abstraction.

```typescript
function createClient(options?: Omit<RedisOptions, "keyPrefix">): Redis
```

- `options` — Redis connection options (URL, host, port, password, db).

**Returns:** A raw ioredis `Redis` client instance.

#### `createProvider(options)`

Creates a Redis-backed cache provider that implements the `CacheProvider`
interface using ioredis. Supports tag-based invalidation via Redis sets.
Reads `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD` from env.

```typescript
function createProvider(options?: RedisOptions): CacheProvider
```

- `options` — Redis connection and behavior options (URL, host, port, password, key prefix).

**Returns:** A `CacheProvider` backed by Redis.

### Constants

#### `cacheRedisSecretDefinitions`

Secret definitions required by the Redis cache bond.

```typescript
const cacheRedisSecretDefinitions: SecretDefinition[]
```

#### `provider`

The provider implementation.

```typescript
const provider: CacheProvider
```

## Core Interface
Implements `@molecule/api-cache` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-cache'
import { provider } from '@molecule/api-cache-redis'

export function setupCacheRedis(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-cache` ^1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `REDIS_URL` *(optional)* — Redis connection URL — default: `redis://localhost:6379`
  - **Provisioned automatically in molecule.dev sandboxes** — manual setup only needed outside the platform.
  - Setup: Redis connection string (redis:// or rediss:// for TLS). molecule.dev runs a Redis inside your app's container automatically (dev and production) — set this only to use an external/managed Redis; locally, the Docker Compose default works.
  - Example: `redis://localhost:6379`

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-cache`
- `@molecule/api-secrets`
- `ioredis`

- **Explicit config beats ambient env.** `createProvider({ host, port, ... })` connects
  to exactly that server even when `REDIS_URL` is set in the environment — env vars
  only fill in options the call site left unspecified.
- **`clear()` scans and deletes only keys under this provider's `keyPrefix`**
  (`SCAN MATCH <keyPrefix>*` + batched `UNLINK`) — it never runs `FLUSHDB`/`FLUSHALL`,
  so it is safe to call on a Redis db shared with sessions, `@molecule/api-cron-bullmq`
  queues, or rate-limit counters from other apps.
- **Reads degrade like a cache miss; writes still throw.** `get()`/`has()`/`getMany()`
  catch Redis/connection errors, log them, and return `undefined`/`false`/an empty map
  (matching `@molecule/api-cache-memcached`'s read behavior) — check the logs to tell a
  down Redis apart from a real miss. `set()`/`delete()`/`clear()` still throw: a write
  failure must be visible to the caller, it can't silently look like "nothing to cache."
- **When Redis is unreachable, commands do not fail fast by default** — ioredis queues
  them offline and retries (default `maxRetriesPerRequest: 20`, ~10s+ per command)
  before rejecting. Pass `maxRetriesPerRequest`, `enableOfflineQueue`, and/or
  `commandTimeout` to `createProvider(options)` to bound this (e.g.
  `{ maxRetriesPerRequest: 1, commandTimeout: 2000 }` surfaces a down Redis in ~2s
  instead of 10s+); they are forwarded to the underlying ioredis client unchanged.
- **Tag membership stays exact, not "ever-tagged":** `_tag:<tag>` Redis SETs are kept in
  sync via a reverse index (`_tags:<key>`), so `delete()`/`deleteMany()` and a re-`set()`
  that drops or changes a key's tags both `SREM` it out of its OLD tag sets first —
  `invalidateTag()` never deletes a key that no longer carries that tag. The tag SETs
  themselves are still stored WITHOUT a TTL and are only cleared by `invalidateTag()` or
  `clear()` (a tagged key that merely expires leaves its tag membership until then).

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
- [ ] Deletion reflects a miss: after `delete(key)`, `has(key)` is `false` and
  `get(key)` returns `undefined`, so the app recomputes fresh from source
  instead of serving the removed entry.
- [ ] TTL expiry refetches: once `CacheOptions.ttl` seconds elapse, the next
  read recomputes fresh data — a stale value is NEVER served past its TTL.
- [ ] A write that changes the underlying record invalidates its key (via
  `delete()` or a re-`set()`) so the very next read reflects the change — the app
  never serves a stale cached copy after an update.
- [ ] AUTHORIZATION: a per-user or per-tenant value is cached under a key that
  INCLUDES the user/tenant id (`user:123:profile`, never a global `profile`).
  Load user A's data, then user B's — B must receive B's own data, never A's
  cached copy. A shared key for per-user data is a cross-user data leak, not an
  optimization.
- [ ] A cache backend failure or miss DEGRADES to computing from source: the
  request still succeeds (getProvider()/get() unavailable falls back to the
  real query) rather than erroring the whole request.
