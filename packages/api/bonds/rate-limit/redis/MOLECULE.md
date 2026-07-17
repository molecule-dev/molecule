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

// Fail CLOSED (deny) on a Redis outage for an abuse-sensitive deployment:
const strict = createProvider({ url: 'redis://my-redis:6379', failMode: 'closed' })
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
  /**
   * What to do when Redis is unreachable/errors on a limit decision
   * (`check`/`consume`/`getRemaining`):
   *
   * - `'open'` (**default**) — ADMIT the request. A transient Redis blip does
   *   not deny all traffic; rate limiting is simply degraded/disabled until
   *   Redis recovers. Does NOT protect the backend from abuse during the outage.
   * - `'closed'` — DENY the request (429). Protects an abuse-sensitive endpoint
   *   (login, OTP, password reset) at the cost of locking out legitimate users
   *   while Redis is down.
   *
   * The backend error is ALWAYS logged at `error` severity regardless of mode —
   * the failure is never silent. Defaults from the `REDIS_RATE_LIMIT_FAIL_MODE`
   * env var when unset here, else `'open'`.
   *
   * Why `'open'` is the default: a rate limiter is an availability-protection
   * control, not an auth control. Failing closed converts a dependency hiccup
   * into a full outage for every legitimate user — usually a worse blast radius
   * than briefly un-throttled traffic. Set `'closed'` for endpoints where abuse
   * protection outweighs availability.
   */
  failMode?: RedisFailMode
}
```

### Types

#### `RedisFailMode`

How the limiter behaves when the Redis backend is unreachable or errors on a
limit decision.

- `'open'` — ADMIT the request (rate limiting is effectively disabled while
  Redis is down).
- `'closed'` — DENY the request (respond 429).

```typescript
type RedisFailMode = 'open' | 'closed'
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
- `@molecule/api-bond` ^1.0.0
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
- **Backend-failure policy is configurable and NEVER silent.** When Redis is
  unreachable/errors on a limit decision (`check`/`consume`/`getRemaining`), the error
  is ALWAYS logged at `error` severity, then the configured `failMode` applies:
  `'open'` (**default**) ADMITS the request (rate limiting is degraded/disabled until
  Redis recovers); `'closed'` DENIES it (429). Set via the `failMode` option or the
  `REDIS_RATE_LIMIT_FAIL_MODE` env var. Default is `'open'` because a rate limiter is
  an availability control — failing closed turns a Redis blip into a full outage for
  every legitimate user. Use `'closed'` on abuse-sensitive endpoints (login, OTP,
  password reset), and don't rely on this limiter as the ONLY control there.
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
