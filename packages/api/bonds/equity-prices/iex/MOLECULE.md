# @molecule/api-equity-prices-iex

IEX Cloud equity-prices provider for molecule.dev.

Implements the `EquityPricesProvider` interface against the public IEX
Cloud `https://cloud.iexapis.com/stable/` endpoints. Provides quotes
(`/stock/:symbol/quote`), historical bars (`/stock/:symbol/chart/:range`),
symbol search (`/search/:query`), and fundamentals
(`/stock/:symbol/company` + `/stock/:symbol/stats`).

Requires `IEX_API_KEY`. The provider detects HTTP `402 Payment Required`
(IEX Cloud's quota-exhausted / paid-tier-required signal) and surfaces
it via `Error.cause.code === 'RATE_LIMITED'`. The API key is sanitized
out of all error messages.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-equity-prices'
import { provider } from '@molecule/api-equity-prices-iex'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-equity-prices-iex @molecule/api-equity-prices @molecule/api-secrets
```

## API

### Interfaces

#### `IexEquityPricesConfig`

Configuration options for the IEX Cloud equity-prices provider.

IEX Cloud requires an API token (`IEX_API_KEY`) which is sent as the
`token` query parameter on every request.

```typescript
interface IexEquityPricesConfig {
  /**
   * API key, sent as the `token` query parameter on every request.
   *
   * If omitted, the provider falls back to the `IEX_API_KEY` environment
   * variable. Requests will fail with a descriptive (and sanitized) error
   * if neither is set.
   */
  apiKey?: string

  /**
   * Base URL override. Defaults to `'https://cloud.iexapis.com/stable'`.
   * Useful for sandbox (`'https://sandbox.iexapis.com/stable'`),
   * self-hosted proxies, and testing.
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

Creates an IEX Cloud equity-prices provider.

```typescript
function createProvider(config?: IexEquityPricesConfig): EquityPricesProvider
```

- `config` — Provider configuration. The API key may be supplied here directly or via the `IEX_API_KEY` environment variable.

**Returns:** An {@link EquityPricesProvider} backed by IEX Cloud.

#### `sanitizeUrl(url)`

Returns a copy of {@link url} with the `token` query parameter redacted,
so it can safely appear in error messages and logs.

```typescript
function sanitizeUrl(url: string): string
```

- `url` — URL string that may contain a `token=...` query parameter.

**Returns:** The same URL with `token=REDACTED`.

### Constants

#### `equityPricesIexSecretDefinitions`

Secret definitions required by the IEX Cloud equity-prices bond.

```typescript
const equityPricesIexSecretDefinitions: SecretDefinition[]
```

#### `MISSING_API_KEY`

Error code raised when the IEX Cloud API key is missing (neither the
config object nor the `IEX_API_KEY` environment variable provided one).

```typescript
const MISSING_API_KEY: "MISSING_API_KEY"
```

#### `provider`

The default provider implementation, lazily initialized on first use.

Reads `IEX_API_KEY` and (optional) `IEX_BASE_URL` from environment
variables. Use {@link createProvider} directly if you need to supply
configuration programmatically.

```typescript
const provider: EquityPricesProvider
```

#### `RATE_LIMITED`

Error code raised when IEX Cloud signals that the configured plan has
exhausted its message quota or that payment is required (HTTP `402 Payment
Required`). Surfaced via `Error.cause` so callers can handle it distinctly
from generic upstream errors and back-off / disable equity features
without leaking the API key.

```typescript
const RATE_LIMITED: "RATE_LIMITED"
```

#### `UPSTREAM_ERROR`

Error code raised when IEX Cloud returns a non-OK HTTP status (other than
`402`) or a body whose JSON shape indicates an upstream error.

```typescript
const UPSTREAM_ERROR: "UPSTREAM_ERROR"
```

## Core Interface
Implements `@molecule/api-equity-prices` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-equity-prices'
import { provider } from '@molecule/api-equity-prices-iex'

export function setupEquityPricesIex(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-equity-prices` ^1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `IEX_API_KEY` *(required)* — IEX Cloud API token
  - Setup: Copy an API token from the IEX Cloud console (service availability may vary).
  - Get it here: [https://iexcloud.io/](https://iexcloud.io/)
  - Example: `pk_...`

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
