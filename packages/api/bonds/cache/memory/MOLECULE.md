# @molecule/api-cache-memory

In-memory cache provider for molecule.dev.

A simple, zero-dependency cache provider for development and testing.
Not suitable for production multi-instance deployments.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-cache-memory
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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-cache` ^1.0.0
