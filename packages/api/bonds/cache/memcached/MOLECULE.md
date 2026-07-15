# @molecule/api-cache-memcached

Memcached cache provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-cache-memcached @molecule/api-bond @molecule/api-cache @molecule/api-secrets memcached
npm install -D @types/memcached
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

#### `MemcachedOptions`

Options for creating a Memcached cache provider.

```typescript
interface MemcachedOptions {
  servers?: string | string[]
  host?: string
  port?: number
  keyPrefix?: string
  options?: Memcached.options
}
```

### Functions

#### `createProvider(options)`

Creates a Memcached-backed cache provider that implements the `CacheProvider`
interface. Supports tag-based invalidation by storing tag-to-key mappings
alongside cached values, and a namespace-versioned `clear()` (memcached has
no key-enumeration command, so a scoped-delete flush is not possible directly).

```typescript
function createProvider(options?: MemcachedOptions): CacheProvider
```

- `options` — Memcached connection and behavior options (servers, host, port, key prefix).

**Returns:** A `CacheProvider` backed by Memcached.

### Constants

#### `cacheMemcachedSecretDefinitions`

Secret definitions required by the Memcached cache bond.

`MEMCACHED_SERVERS` is `required: false` — `createProvider()` degrades
gracefully to `localhost:11211` when it is unset (mirroring the Redis
bond's `REDIS_URL`, also `required: false`), so a boot-time secrets report
must not flag a perfectly working default config as "not configured".

```typescript
const cacheMemcachedSecretDefinitions: SecretDefinition[]
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
import { provider } from '@molecule/api-cache-memcached'

export function setupCacheMemcached(): void {
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

- `MEMCACHED_SERVERS` *(optional)* — Memcached servers — default: `localhost:11211`
  - Setup: Comma-separated host:port list of memcached servers.
  - Example: `localhost:11211`

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-cache`
- `@molecule/api-secrets`
- `memcached`

- **Explicit config beats ambient env.** `createProvider({ host, port })` connects to
  exactly that server even when `MEMCACHED_SERVERS` is set in the environment — env
  vars only fill in options the call site left unspecified.
- `ttl` always means "seconds from now": TTLs beyond memcached's 30-day relative limit
  are converted to the absolute unix timestamp the protocol expects (a raw value over
  2592000s would otherwise be read as a 1970s timestamp and expire immediately).
- **Reads are best-effort:** if the memcached server is unreachable, `get()`/`has()`
  log the error and return `undefined`/`false` — indistinguishable from a cache miss
  at the call site (check the logs). Writes (`set`/`clear`) throw instead.
- Memcached keys must be ≤250 characters with no spaces or control characters
  (including the `molecule:` prefix this provider prepends); violating keys error.
- **`clear()` uses namespace versioning, not a real flush.** Memcached has no
  `SCAN`/key-enumeration command, so there is no way to delete only this provider's
  keys directly (unlike the Redis bond's `SCAN`+`UNLINK`). Every key is written under
  `<keyPrefix>v<N>:`; `clear()` atomically increments `N` (stored at the well-known key
  `<keyPrefix>__version__`) so every key from the previous generation becomes
  permanently UNREACHABLE — it is NOT deleted immediately and still occupies memory
  until memcached's normal LRU eviction reclaims it. This never touches another app's
  keys sharing the same memcached server (unlike a raw `flush_all`). The current
  version is cached in-process for up to 30s, so a `clear()` issued by ANOTHER process
  is picked up here within that window, not instantly.
- **Tag invalidation is best-effort ("ever-tagged"), not guaranteed exact,** because
  memcached has no native set type: `_tag:<tag>` is a newline-delimited log of keys,
  appended to atomically (safe under concurrent tagged `set()` calls) but PRUNED with a
  read-modify-write on `delete()`/a re-`set()` without the tag — two concurrent
  removals from the SAME tag can still race and leave a stale entry (harmless:
  `invalidateTag()` deleting an already-gone key is a no-op). If exact tag membership
  matters, use the Redis bond instead (native `SADD`/`SREM`).
