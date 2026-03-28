# @molecule/api-rate-limit-redis

Redis sliding-window rate-limit provider for molecule.dev.

Provides a distributed rate limiter backed by Redis sorted sets,
implementing a precise sliding-window algorithm. Suitable for
multi-instance and clustered deployments.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-rate-limit-redis
```

## Usage

```typescript
import { setProvider } from '@molecule/api-rate-limit'
import { provider } from '@molecule/api-rate-limit-redis'

setProvider(provider)

// Or create a custom instance with explicit Redis config
import { createProvider } from '@molecule/api-rate-limit-redis'

const redisRateLimit = createProvider({ url: 'redis://my-redis:6379' })
setProvider(redisRateLimit)
```

## API

### Interfaces

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
