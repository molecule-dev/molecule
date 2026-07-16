# @molecule/api-equity-prices-alpha-vantage

Alpha Vantage equity-prices provider for molecule.dev.

Implements the `EquityPricesProvider` interface against the public Alpha
Vantage `https://www.alphavantage.co/query` endpoint. Provides quotes
(`GLOBAL_QUOTE`), historical bars (`TIME_SERIES_DAILY` /
`TIME_SERIES_INTRADAY`), symbol search (`SYMBOL_SEARCH`), and
fundamentals (`OVERVIEW`).

Requires `ALPHA_VANTAGE_API_KEY` (free tier: 5 requests / minute, 500 /
day). The provider detects Alpha Vantage's canonical rate-limit response
and surfaces it via `Error.cause.code === 'RATE_LIMITED'`. The API key
is sanitized out of all error messages.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-equity-prices'
import { provider } from '@molecule/api-equity-prices-alpha-vantage'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-equity-prices-alpha-vantage @molecule/api-equity-prices @molecule/api-secrets
```

## API

### Interfaces

#### `AlphaVantageEquityPricesConfig`

Configuration options for the Alpha Vantage equity-prices provider.

Alpha Vantage requires a free API key (`ALPHA_VANTAGE_API_KEY`) which is
sent as the `apikey` query parameter on every request.

```typescript
interface AlphaVantageEquityPricesConfig {
  /**
   * API key, sent as the `apikey` query parameter on every request.
   *
   * If omitted, the provider falls back to the `ALPHA_VANTAGE_API_KEY`
   * environment variable. Requests will fail with a descriptive (and
   * sanitized) error if neither is set.
   */
  apiKey?: string

  /**
   * Base URL override. Defaults to `'https://www.alphavantage.co'`. Useful
   * for self-hosted / proxy deployments and for testing.
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

Creates an Alpha Vantage equity-prices provider.

```typescript
function createProvider(config?: AlphaVantageEquityPricesConfig): EquityPricesProvider
```

- `config` — Provider configuration. The API key may be supplied here

**Returns:** An {@link EquityPricesProvider} backed by Alpha Vantage.

#### `sanitizeUrl(url)`

Returns a copy of {@link url} with the `apikey` query parameter redacted,
so it can safely appear in error messages and logs.

```typescript
function sanitizeUrl(url: string): string
```

- `url` — URL string that may contain an `apikey=...` query parameter.

**Returns:** The same URL with `apikey=REDACTED`.

### Constants

#### `equityPricesAlphaVantageSecretDefinitions`

Secret definitions required by the Alpha Vantage equity-prices bond.

```typescript
const equityPricesAlphaVantageSecretDefinitions: SecretDefinition[]
```

#### `MISSING_API_KEY`

Error code raised when the Alpha Vantage API key is missing (neither the
config object nor the `ALPHA_VANTAGE_API_KEY` environment variable
provided one).

```typescript
const MISSING_API_KEY: "MISSING_API_KEY"
```

#### `provider`

The default provider implementation, lazily initialized on first use.

Reads `ALPHA_VANTAGE_API_KEY` and (optional) `ALPHA_VANTAGE_BASE_URL`
from environment variables. Use {@link createProvider} directly if you
need to supply configuration programmatically.

```typescript
const provider: EquityPricesProvider
```

#### `RATE_LIMITED`

Error code raised when Alpha Vantage's free-tier rate limit (5 req/min /
500 req/day) is exceeded. Surfaced via `Error.cause` on rate-limit
failures so callers can handle them distinctly from generic upstream
errors.

```typescript
const RATE_LIMITED: "RATE_LIMITED"
```

#### `UPSTREAM_ERROR`

Error code raised when Alpha Vantage returns a body whose JSON shape
indicates an upstream error (e.g. invalid symbol, unknown function).

```typescript
const UPSTREAM_ERROR: "UPSTREAM_ERROR"
```

## Core Interface
Implements `@molecule/api-equity-prices` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-equity-prices'
import { provider } from '@molecule/api-equity-prices-alpha-vantage'

export function setupEquityPricesAlphaVantage(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-equity-prices` ^1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `ALPHA_VANTAGE_API_KEY` *(required)* — Alpha Vantage API key
  - Setup: Request a free API key on the Alpha Vantage site.
  - Get it here: [https://www.alphavantage.co/support/#api-key](https://www.alphavantage.co/support/#api-key)

### Runtime Dependencies

- `@molecule/api-equity-prices`
- `@molecule/api-secrets`

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] A known ticker (e.g. `getQuote('AAPL')`) renders a PLAUSIBLE quote in
  the UI — a real `price` in a sane range, formatted with the quote's own
  `currency` (never a hardcoded `$`), never `0` / `null` / `NaN` or a
  spinner that never resolves.
- [ ] Several distinct tickers (e.g. `AAPL` and `MSFT`) each render their
  OWN price — not one shared placeholder or the same number repeated (a
  stale-cache or wrong-symbol wiring bug).
- [ ] If the app charts history, `getHistorical(symbol, range)` returns an
  ascending series of `{ ts, close }` that actually draws a line that moves
  — not an empty array, a flat line, or points in reversed order.
- [ ] An invalid / unknown ticker resolves to a clear "not found" in the UI
  (empty `searchSymbol()` results, or a caught `getQuote` error) — never a
  crash, a blank card, or a `NaN` price.
- [ ] Staleness is honest: the quote's `ts` is surfaced (a timestamp or a
  "delayed / last close" label) so an out-of-hours last-close price is NOT
  presented as a live trade — the UI never dresses stale data up as real-time.
- [ ] A provider rate-limit / outage (free tiers cap at a few calls) degrades
  gracefully to last-known-cached data or an empty state with a message —
  never a crashed page or a `NaN`; quotes are cached server-side, not
  refetched per render.
- [ ] The provider API key stays server-side: quotes are served only through
  the app's own authenticated endpoint, scoped to specific symbols — not an
  open, unbounded proxy any caller can pass arbitrary tickers/params to.
