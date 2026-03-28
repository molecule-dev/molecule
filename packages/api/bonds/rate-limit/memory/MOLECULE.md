# @molecule/api-rate-limit-memory

In-memory rate-limit provider for molecule.dev.

Provides a fixed-window rate limiter backed by an in-memory `Map`.
Ideal for development, testing, and single-instance deployments.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-rate-limit-memory
```

## Usage

```typescript
import { setProvider } from '@molecule/api-rate-limit'
import { provider } from '@molecule/api-rate-limit-memory'

setProvider(provider)
provider.configure({ windowMs: 60_000, max: 100 })
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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-rate-limit` ^1.0.0
