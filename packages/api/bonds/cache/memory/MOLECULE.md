# @molecule/api-cache-memory

In-memory cache provider for molecule.dev.

A simple, zero-dependency cache provider for development and testing.
Not suitable for production multi-instance deployments.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-cache-memory @molecule/api-cache
```

## API

### Interfaces

#### `CacheEntry`

A cached entry with optional TTL and tags.

```typescript
interface CacheEntry<T = unknown> {
  value: T
  expiresAt?: number
  tags?: string[]
}
```

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

#### `MemoryOptions`

Options for creating an in-memory cache provider.

```typescript
interface MemoryOptions {
  /**
   * Maximum number of entries to store (LRU eviction).
   */
  maxSize?: number

  /**
   * Default TTL in seconds.
   */
  defaultTtl?: number

  /**
   * Interval in ms for cleaning up expired entries.
   */
  cleanupInterval?: number
}
```

### Functions

#### `createProvider(options)`

Creates an in-memory cache provider with LRU eviction, TTL expiration,
and tag-based invalidation. Suitable for development and single-instance
deployments — not recommended for multi-instance production.

```typescript
function createProvider(options?: MemoryOptions): CacheProvider
```

- `options` — Memory cache options (max size, default TTL, cleanup interval).

**Returns:** A `CacheProvider` backed by an in-memory `Map`.

### Constants

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
import { provider } from '@molecule/api-cache-memory'

export function setupCacheMemory(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-cache` ^1.0.0

### Runtime Dependencies

- `@molecule/api-cache`

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
