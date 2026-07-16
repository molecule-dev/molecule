# @molecule/api-rate-limit

Provider-agnostic rate-limiting interface for molecule.dev.

Defines the `RateLimitProvider` interface for request throttling with
configurable windows, token consumption, and reset. Bond packages
(in-memory, Redis, etc.) implement this interface. Application code
uses the convenience functions (`check`, `consume`, `reset`, `getRemaining`)
which delegate to the bonded provider, or the Express middleware factory.

## Quick Start

```typescript
import { setProvider, consume, createRateLimitMiddleware } from '@molecule/api-rate-limit'
import { provider as memory } from '@molecule/api-rate-limit-memory'

setProvider(memory)

// Use convenience functions directly
const result = await consume('user:123')
if (!result.allowed) console.log('Rate limited, retry after', result.retryAfter)

// Or as Express middleware
app.use(createRateLimitMiddleware({ windowMs: 60_000, max: 100 }))
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-rate-limit @molecule/api-bond @molecule/api-i18n
```

## API

### Interfaces

#### `RateLimitOptions`

Configuration options for rate limiting.

```typescript
interface RateLimitOptions {
  /** Time window in milliseconds. */
  windowMs: number

  /** Maximum number of requests allowed within the window. */
  max: number

  /** Optional prefix for rate limit keys (useful for namespacing). */
  keyPrefix?: string

  /** If `true`, failed requests (status >= 400) are not counted. */
  skipFailedRequests?: boolean

  /** If `true`, successful requests (status < 400) are not counted. */
  skipSuccessfulRequests?: boolean
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
  check(key: string): Promise<RateLimitResult>

  /**
   * Consumes one or more tokens from the rate limit bucket.
   *
   * @param key - Unique identifier for the rate limit bucket.
   * @param cost - Number of tokens to consume (defaults to 1).
   * @returns The updated rate limit state after consumption.
   */
  consume(key: string, cost?: number): Promise<RateLimitResult>

  /**
   * Resets the rate limit state for a given key.
   *
   * @param key - Unique identifier for the rate limit bucket to reset.
   */
  reset(key: string): Promise<void>

  /**
   * Returns the number of remaining tokens for a given key.
   *
   * @param key - Unique identifier for the rate limit bucket.
   * @returns Number of remaining requests in the current window.
   */
  getRemaining(key: string): Promise<number>

  /**
   * Applies new rate limit configuration to the provider.
   *
   * @param options - The rate limit options to apply.
   */
  configure(options: RateLimitOptions): void
}
```

#### `RateLimitResult`

Result of a rate limit check or consumption.

```typescript
interface RateLimitResult {
  /** Whether the request is allowed. */
  allowed: boolean

  /** Number of requests remaining in the current window. */
  remaining: number

  /** Total requests allowed in the window. */
  total: number

  /** Date when the current window resets. */
  resetAt: Date

  /** Seconds until the client should retry (present only when `allowed` is `false`). */
  retryAfter?: number
}
```

### Types

#### `RequestHandler`

Express-compatible request handler.

```typescript
type RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void | Promise<void>
```

### Functions

#### `check(key)`

Checks whether a request identified by `key` is within the rate limit
without consuming a token.

```typescript
function check(key: string): Promise<RateLimitResult>
```

- `key` — Unique identifier for the rate limit bucket (e.g. IP, user ID).

**Returns:** The current rate limit state for the key.

#### `configure(options)`

Applies new rate limit configuration to the bonded provider.

```typescript
function configure(options: RateLimitOptions): void
```

- `options` — The rate limit options to apply.

#### `consume(key, cost)`

Consumes one or more tokens from the rate limit bucket.

```typescript
function consume(key: string, cost?: number): Promise<RateLimitResult>
```

- `key` — Unique identifier for the rate limit bucket.
- `cost` — Number of tokens to consume (defaults to 1).

**Returns:** The updated rate limit state after consumption.

#### `createRateLimitMiddleware(options)`

Creates an Express middleware that enforces rate limiting.

When the rate limit is exceeded, responds with HTTP 429 and sets standard
rate-limit headers (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`,
`Retry-After`).

```typescript
function createRateLimitMiddleware(options?: RateLimitOptions): RequestHandler
```

- `options` — Optional rate limit configuration to apply before the middleware runs.

**Returns:** An Express request handler.

#### `getProvider()`

Retrieves the bonded rate-limit provider, throwing if none is configured.

```typescript
function getProvider(): RateLimitProvider
```

**Returns:** The bonded rate-limit provider.

#### `getRemaining(key)`

Returns the number of remaining tokens for a given key.

```typescript
function getRemaining(key: string): Promise<number>
```

- `key` — Unique identifier for the rate limit bucket.

**Returns:** Number of remaining requests in the current window.

#### `hasProvider()`

Checks whether a rate-limit provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a rate-limit provider is bonded.

#### `reset(key)`

Resets the rate limit state for a given key.

```typescript
function reset(key: string): Promise<void>
```

- `key` — Unique identifier for the rate limit bucket to reset.

**Returns:** A promise that resolves when the bucket has been reset.

#### `setProvider(provider)`

Registers a rate-limit provider as the active singleton. Called by bond
packages during application startup.

```typescript
function setProvider(provider: RateLimitProvider): void
```

- `provider` — The rate-limit provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| Rate Limit | `@molecule/api-rate-limit-memory` |
| Rate Limit | `@molecule/api-rate-limit-redis` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-i18n`

- **The memory bond is per-process.** Counters reset on restart and are NOT shared across
  instances — behind a load balancer each instance enforces its own budget. Use a
  shared-store bond (e.g. `@molecule/api-rate-limit-redis`) when running more than one
  process.
- **The middleware keys by `req.ip`.** Behind a reverse proxy every request can carry the
  proxy's address — enable your framework's proxy trust (e.g. Express
  `app.set('trust proxy', 1)`) so `req.ip` is the real client, or ALL users share one
  bucket.
- **One provider = one active config.** `createRateLimitMiddleware(options)` re-applies its
  options on every request, so stacking middlewares with different options makes them
  clobber each other's window/max — and both count against the same `req.ip` key. Mount ONE
  app-wide middleware; for a stricter limit on a sensitive endpoint (login, OTP, password
  reset) call `consume('login:' + identifier)` directly in that handler with its own
  namespaced key.
- Rate-limit auth endpoints by the attempted identifier (email/username), not only IP — a
  credential-stuffing attacker rotates IPs but reuses identifiers.
- `skipFailedRequests`/`skipSuccessfulRequests` on {@link RateLimitOptions} are not honored
  by the bundled middleware or bonds — do not rely on them.
- On rejection respond 429 with `Retry-After` (the middleware does this and sets the
  standard `RateLimit-*` headers from {@link RateLimitResult}).
