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
npm install @molecule/api-rate-limit-redis @molecule/api-rate-limit ioredis
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

## Core Interface
Implements `@molecule/api-rate-limit` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-rate-limit'
import { provider } from '@molecule/api-rate-limit-redis'

export function setupRateLimitRedis(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-rate-limit` ^1.0.0

### Environment Variables

- `REDIS_URL` *(optional)* — Redis connection URL — default: `redis://localhost:6379`
  - **Provisioned automatically in molecule.dev sandboxes** — manual setup only needed outside the platform.
  - Setup: Redis connection string (redis:// or rediss:// for TLS). molecule.dev runs a Redis inside your app's container automatically (dev and production) — set this only to use an external/managed Redis; locally, the Docker Compose default works.
  - Example: `redis://localhost:6379`

### Runtime Dependencies

- `@molecule/api-rate-limit`
- `ioredis`

- **Requires a reachable Redis server** (`REDIS_URL`, or `REDIS_HOST`/`REDIS_PORT`/
  `REDIS_PASSWORD`; defaults to `localhost:6379`). Connection config is read on FIRST
  use (lazy), so env vars may be set any time before the first rate-limit call.
- **Fails OPEN, not closed.** A Redis-side error never blocks traffic: `consume()`
  allows the request when the atomic script's reply is unusable, and
  `check()`/`getRemaining()` treat command errors as an empty window. A hard
  connection failure surfaces as a thrown/hung call instead (ioredis retries) — so an
  unreachable Redis degrades or disables rate limiting rather than denying requests.
  Don't rely on this limiter as the ONLY control on an abuse-sensitive endpoint.
- `consume()` is atomic (single server-side Lua script) — concurrent requests cannot
  overshoot the limit. `check()`/`getRemaining()` are non-mutating estimates.

## E2E Tests

Integration checklist — exercise the REAL behavior end-to-end (drive the
protected app action in the live preview, no mocks), adapt each item to this
app's actual screens/flows, and check every box off one by one. A box you
can't check is an integration bug to fix — not a skip:
- [ ] The limit is actually ENFORCED on the route: driving the protected
  action up to `RateLimitOptions.max` times succeeds, and the NEXT request
  within `windowMs` is REJECTED with the provider's limited response (HTTP
  429 + `Retry-After` from `createRateLimitMiddleware`) — not silently
  allowed. THE #1 TRAP: the middleware is defined but never actually mounted
  on the route (or `consume(key)` is never called in the handler), so nothing
  is limited.
- [ ] The limit is bucketed by the RIGHT identity — the `consume(key)` /
  middleware `req.ip` key is per-user (or per-IP for anon), NOT one GLOBAL
  bucket: two different users/IPs have INDEPENDENT budgets (user B is not
  throttled by user A's traffic), and a per-user limit is not trivially
  bypassed by rotating an unauthenticated path. A global bucket for a
  per-user limit is both a DoS vector and a correctness bug.
- [ ] `RateLimitResult.remaining` (and `getRemaining(key)`) decrements
  accurately with each `consume` and reads what's left, and
  `RateLimitResult.resetAt` reports when the current window resets.
- [ ] The window RESETS: after `RateLimitOptions.windowMs` elapses (or
  `reset(key)` is called) the budget is restored and the action succeeds
  again — a limit is never permanent.
- [ ] The rejection is graceful and observable: the UI surfaces a "too many
  requests / try again" state (ideally using `RateLimitResult.resetAt` /
  `retryAfter`), not a blank error or a stuck spinner.
- [ ] `consume` is atomic under concurrency: N simultaneous requests cannot
  all slip through above `RateLimitOptions.max` (no `check`-then-`consume`
  race that lets the budget be exceeded).
