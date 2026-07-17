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

  /**
   * If `true`, a request that ends in failure (final HTTP status `>= 400`) is not
   * counted against the limit — its consumed token is refunded once the response
   * completes. Honored ONLY by {@link createRateLimitMiddleware}, which observes
   * the response status; a direct `consume()` call cannot know the outcome, so it
   * never rolls anything back.
   */
  skipFailedRequests?: boolean

  /**
   * If `true`, a request that ends in success (final HTTP status `< 400`) is not
   * counted against the limit — its consumed token is refunded once the response
   * completes. Honored ONLY by {@link createRateLimitMiddleware}; a direct
   * `consume()` call cannot know the outcome.
   */
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
   * Refunds (un-consumes) previously consumed tokens for a key, rolling back a
   * prior {@link consume}. Used by {@link createRateLimitMiddleware} to honor
   * {@link RateLimitOptions.skipFailedRequests} /
   * {@link RateLimitOptions.skipSuccessfulRequests}: once the response status is
   * known, a request that should not count has its token rolled back.
   *
   * Providers refund the most recent consumption(s); the bucket never drops below
   * zero, and refunding an unknown/expired bucket (or a non-positive `cost`) is a
   * no-op.
   *
   * @param key - Unique identifier for the rate limit bucket.
   * @param cost - Number of tokens to refund (defaults to 1).
   */
  refund(key: string, cost?: number): Promise<void>

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

If `options.skipFailedRequests` or `options.skipSuccessfulRequests` is set, the
token consumed for an allowed request is refunded (via `provider.refund()`) once
the response completes and its final status matches — failed is `statusCode >= 400`,
successful is `< 400` — so those requests are not counted against the limit.

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

#### `refund(key, cost)`

Refunds (un-consumes) previously consumed tokens for a key on the bonded provider,
rolling back a prior {@link consume}.

```typescript
function refund(key: string, cost?: number): Promise<void>
```

- `key` — Unique identifier for the rate limit bucket.
- `cost` — Number of tokens to refund (defaults to 1).

**Returns:** A promise that resolves when the tokens have been refunded.

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
| In-memory rate limit | `@molecule/api-rate-limit-memory` |
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
- `skipFailedRequests`/`skipSuccessfulRequests` on {@link RateLimitOptions} are honored by
  `createRateLimitMiddleware`: after the response completes, a request whose final status
  matches the flag (`>= 400` for failed, `< 400` for successful) has its consumed token
  refunded via the provider's `refund()`, so it isn't counted. They apply ONLY through the
  middleware — calling `consume()` directly cannot know the outcome and rolls nothing back.
- On rejection respond 429 with `Retry-After` (the middleware does this and sets the
  standard `RateLimit-*` headers from {@link RateLimitResult}).

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
