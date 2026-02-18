# @molecule/api-cache

Provider-agnostic caching interface for molecule.dev.

Defines the `CacheProvider` interface for key-value caching with TTL, tags,
batch operations, and cache-aside (`getOrSet`). Bond packages (Redis, Memcached,
in-memory, etc.) implement this interface. Application code uses the convenience
functions (`get`, `set`, `del`, `has`, `getOrSet`) which delegate to the bonded provider.

## Type
`core`

## Installation
```bash
npm install @molecule/api-cache
```

## Usage

```typescript
import { setProvider, get, set, getOrSet } from '@molecule/api-cache'
import { provider as redis } from '@molecule/api-cache-redis'

setProvider(redis)
await set('user:123', userData, { ttl: 3600 })
const cached = await get<UserData>('user:123')
const fresh = await getOrSet('user:456', () => fetchUser('456'), { ttl: 600 })
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

## Translations

Translation strings are provided by `@molecule/api-locales-cache`.
