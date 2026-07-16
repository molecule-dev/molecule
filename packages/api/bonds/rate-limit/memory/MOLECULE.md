# @molecule/api-rate-limit-memory

In-memory rate-limit provider for molecule.dev.

Provides a fixed-window rate limiter backed by an in-memory `Map`.
Ideal for development, testing, and single-instance deployments.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-rate-limit'
import { provider } from '@molecule/api-rate-limit-memory'

setProvider(provider)
provider.configure({ windowMs: 60_000, max: 100 })
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-rate-limit-memory @molecule/api-rate-limit
```

## API

### Interfaces

#### `MemoryBucket`

A single rate limit bucket entry tracking token consumption within a window.

```typescript
interface MemoryBucket {
  /** Number of tokens consumed in the current window. */
  consumed: number

  /** Timestamp (ms since epoch) when the current window started. */
  windowStart: number
}
```

### Constants

#### `provider`

In-memory rate-limit provider.

Implements the `RateLimitProvider` interface using a fixed-window algorithm
backed by an in-memory `Map`.

```typescript
const provider: RateLimitProvider
```

## Core Interface
Implements `@molecule/api-rate-limit` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-rate-limit'
import { provider } from '@molecule/api-rate-limit-memory'

export function setupRateLimitMemory(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-rate-limit` ^1.0.0

### Runtime Dependencies

- `@molecule/api-rate-limit`

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
