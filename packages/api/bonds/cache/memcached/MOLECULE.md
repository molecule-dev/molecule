# @molecule/api-cache-memcached

Memcached cache provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-cache-memcached
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
alongside cached values.

```typescript
function createProvider(options?: MemcachedOptions): CacheProvider
```

- `options` — Memcached connection and behavior options (servers, host, port, key prefix).

**Returns:** A `CacheProvider` backed by Memcached.

### Constants

#### `cacheMemcachedSecretDefinitions`

Secret definitions required by the Memcached cache bond.

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

- `MEMCACHED_SERVERS` *(required)* — Memcached servers — default: `localhost:11211`
  - Setup: Comma-separated host:port list of memcached servers.
  - Example: `localhost:11211`

- `ttl` always means "seconds from now": TTLs beyond memcached's 30-day relative limit
  are converted to the absolute unix timestamp the protocol expects (a raw value over
  2592000s would otherwise be read as a 1970s timestamp and expire immediately).
- **Reads are best-effort:** if the memcached server is unreachable, `get()`/`has()`
  log the error and return `undefined`/`false` — indistinguishable from a cache miss
  at the call site (check the logs). Writes (`set`/`clear`) throw instead.
- Memcached keys must be ≤250 characters with no spaces or control characters
  (including the `molecule:` prefix this provider prepends); violating keys error.
