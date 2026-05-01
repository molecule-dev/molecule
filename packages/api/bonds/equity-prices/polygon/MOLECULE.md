# @molecule/api-equity-prices-polygon

Polygon.io equity-prices provider for molecule.dev.

Implements the `EquityPricesProvider` interface against the public
Polygon.io REST endpoints. Provides quotes (`/v2/last/trade`),
historical aggregate bars (`/v2/aggs`), symbol search
(`/v3/reference/tickers`), fundamentals (`/v3/reference/tickers/:symbol`
combined with `/vX/reference/financials`), and a list of supported
stock exchanges (`/v3/reference/exchanges`).

Requires `POLYGON_API_KEY`. The provider detects HTTP 429 rate-limit
responses, parses any `Retry-After` header, and surfaces them via
`Error.cause.code === 'RATE_LIMITED'` with an optional
`Error.cause.retryAfterSeconds`. The API key is sanitized out of all
error messages.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-equity-prices'
import { provider } from '@molecule/api-equity-prices-polygon'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-equity-prices-polygon
```

## API

### Interfaces

#### `PolygonEquityPricesConfig`

Configuration options for the Polygon.io equity-prices provider.

Polygon requires an API key (`POLYGON_API_KEY`) sent as the `apiKey`
query parameter on every request. The free tier supports all five
endpoints used by this provider but caps requests at 5/minute and
delivers end-of-day data only for non-paid plans.

```typescript
interface PolygonEquityPricesConfig {
  /**
   * API key, sent as the `apiKey` query parameter on every request.
   *
   * If omitted, the provider falls back to the `POLYGON_API_KEY`
   * environment variable. Requests will fail with a descriptive (and
   * sanitized) error if neither is set.
   */
  apiKey?: string

  /**
   * Base URL override. Defaults to `'https://api.polygon.io'`. Useful for
   * self-hosted / proxy deployments and for testing.
   */
  baseUrl?: string

  /**
   * Request timeout in milliseconds. Defaults to `10000`.
   */
  timeout?: number
}
```

### Functions

#### `createProvider(config)`

Creates a Polygon.io equity-prices provider.

```typescript
function createProvider(config?: PolygonEquityPricesConfig): EquityPricesProvider
```

- `config` — Provider configuration. The API key may be supplied

**Returns:** An {@link EquityPricesProvider} backed by Polygon.io.

#### `sanitizeUrl(url)`

Returns a copy of {@link url} with the `apiKey` query parameter
redacted, so it can safely appear in error messages and logs. Polygon
uses camelCase `apiKey` (compare Alpha Vantage's lowercase `apikey`).

```typescript
function sanitizeUrl(url: string): string
```

- `url` — URL string that may contain an `apiKey=...` query parameter.

**Returns:** The same URL with `apiKey=REDACTED`.

### Constants

#### `MISSING_API_KEY`

Error code raised when the Polygon.io API key is missing (neither the
config object nor the `POLYGON_API_KEY` environment variable provided
one).

```typescript
const MISSING_API_KEY: "MISSING_API_KEY"
```

#### `provider`

The default provider implementation, lazily initialized on first use.

Reads `POLYGON_API_KEY` and (optional) `POLYGON_BASE_URL` from
environment variables. Use {@link createProvider} directly if you need
to supply configuration programmatically.

```typescript
const provider: EquityPricesProvider
```

#### `RATE_LIMITED`

Error code raised when Polygon.io's rate limit is exceeded (HTTP 429).
Surfaced via `Error.cause` on rate-limit failures so callers can handle
them distinctly from generic upstream errors. When Polygon includes a
`Retry-After` response header, its parsed value (in seconds) is
attached to `Error.cause.retryAfterSeconds`.

```typescript
const RATE_LIMITED: "RATE_LIMITED"
```

#### `UPSTREAM_ERROR`

Error code raised when Polygon.io returns an unexpected payload (no
results block, missing required fields, or a non-OK HTTP status that
isn't a rate-limit response).

```typescript
const UPSTREAM_ERROR: "UPSTREAM_ERROR"
```

## Core Interface
Implements `@molecule/api-equity-prices` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-equity-prices'
import { provider } from '@molecule/api-equity-prices-polygon'

export function setupEquityPricesPolygon(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-equity-prices` ^1.0.0

### Environment Variables

- `POLYGON_API_KEY` *(required)*
