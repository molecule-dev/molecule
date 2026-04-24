# @molecule/api-rate-limit-redis

Redis sliding-window rate-limit provider for molecule.dev.

Provides a distributed rate limiter backed by Redis sorted sets,
implementing a precise sliding-window algorithm. Suitable for
multi-instance and clustered deployments.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-rate-limit'
import { provider } from '@molecule/api-rate-limit-redis'

setProvider(provider)

// Or create a custom instance with explicit Redis config
import { createProvider } from '@molecule/api-rate-limit-redis'

const redisRateLimit = createProvider({ url: 'redis://my-redis:6379' })
setProvider(redisRateLimit)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-rate-limit-redis
```

## API

### Interfaces

#### `RateLimitOptions`

Configuration options for rate limiting.

```typescript
interface RateLimitOptions {
    /** Time window in milliseconds. */
    windowMs: number;
    /** Maximum number of requests allowed within the window. */
    max: number;
    /** Optional prefix for rate limit keys (useful for namespacing). */
    keyPrefix?: string;
    /** If `true`, failed requests (status >= 400) are not counted. */
    skipFailedRequests?: boolean;
    /** If `true`, successful requests (status < 400) are not counted. */
    skipSuccessfulRequests?: boolean;
}
```

#### `RateLimitProvider`

Rate limit provider interface.

All rate limit providers must implement this interface.

```typescript
interface RateLimitProvider {
    /**
     * Checks whether a request identified by `key` is within the rate limit
     * without consuming a token.
     *
     * @param key - Unique identifier for the rate limit bucket (e.g. IP, user ID).
     * @returns The current rate limit state for the key.
     */
    check(key: string): Promise<RateLimitResult>;
    /**
     * Consumes one or more tokens from the rate limit bucket.
     *
     * @param key - Unique identifier for the rate limit bucket.
     * @param cost - Number of tokens to consume (defaults to 1).
     * @returns The updated rate limit state after consumption.
     */
    consume(key: string, cost?: number): Promise<RateLimitResult>;
    /**
     * Resets the rate limit state for a given key.
     *
     * @param key - Unique identifier for the rate limit bucket to reset.
     */
    reset(key: string): Promise<void>;
    /**
     * Returns the number of remaining tokens for a given key.
     *
     * @param key - Unique identifier for the rate limit bucket.
     * @returns Number of remaining requests in the current window.
     */
    getRemaining(key: string): Promise<number>;
    /**
     * Applies new rate limit configuration to the provider.
     *
     * @param options - The rate limit options to apply.
     */
    configure(options: RateLimitOptions): void;
}
```

#### `RateLimitResult`

Result of a rate limit check or consumption.

```typescript
interface RateLimitResult {
    /** Whether the request is allowed. */
    allowed: boolean;
    /** Number of requests remaining in the current window. */
    remaining: number;
    /** Total requests allowed in the window. */
    total: number;
    /** Date when the current window resets. */
    resetAt: Date;
    /** Seconds until the client should retry (present only when `allowed` is `false`). */
    retryAfter?: number;
}
```

#### `RedisRateLimitOptions`

Options for creating a Redis rate-limit provider.

```typescript
interface RedisRateLimitOptions {
  /** Redis connection URL. Takes precedence over host/port/password. */
  url?: string
  /** Redis host (defaults to `localhost` or `REDIS_HOST` env). */
  host?: string
  /** Redis port (defaults to `6379` or `REDIS_PORT` env). */
  port?: number
  /** Redis password (defaults to `REDIS_PASSWORD` env). */
  password?: string
  /** Redis database index (defaults to `0`). */
  db?: number
  /** Prefix for all rate-limit keys in Redis (defaults to `rl:`). */
  keyPrefix?: string
}
```

### Functions

#### `createProvider(redisOptions)`

Creates a Redis-backed rate-limit provider implementing the sliding-window
algorithm. Reads `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD`
from environment variables when explicit options are not provided.

```typescript
function createProvider(redisOptions?: RedisRateLimitOptions): RateLimitProvider
```

- `redisOptions` — Redis connection and behavior options.

**Returns:** A `RateLimitProvider` backed by Redis.

### Constants

#### `provider`

Default Redis rate-limit provider instance. Lazily initialises on first
property access using environment variables for connection config.

```typescript
const provider: RateLimitProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-rate-limit` ^1.0.0
