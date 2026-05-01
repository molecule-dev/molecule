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
is sanitized out of all error messages (URLs containing `apikey=...`
are rewritten to `apikey=REDACTED`).

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
npm install @molecule/api-equity-prices-alpha-vantage
```

## API

### Interfaces

#### `AlphaVantageEquityPricesConfig`

Configuration options for the Alpha Vantage equity-prices provider.

```typescript
interface AlphaVantageEquityPricesConfig {
  /**
   * API key, sent as `apikey` on every request. Falls back to
   * `ALPHA_VANTAGE_API_KEY` env var if omitted.
   */
  apiKey?: string

  /** Base URL override. Defaults to `'https://www.alphavantage.co'`. */
  baseUrl?: string

  /** Request timeout in milliseconds. Defaults to `10000`. */
  timeout?: number
}
```

### Functions

#### `createProvider(config?)`

Creates an Alpha Vantage equity-prices provider.

```typescript
function createProvider(config?: AlphaVantageEquityPricesConfig): EquityPricesProvider
```

#### `sanitizeUrl(url)`

Returns a copy of `url` with the `apikey` query parameter redacted, so it
can safely appear in error messages and logs.

```typescript
function sanitizeUrl(url: string): string
```

### Constants

#### `provider`

The provider implementation, lazily initialized on first use. Reads
`ALPHA_VANTAGE_API_KEY` and (optional) `ALPHA_VANTAGE_BASE_URL` from env
vars.

```typescript
const provider: EquityPricesProvider
```

#### `RATE_LIMITED`, `MISSING_API_KEY`, `UPSTREAM_ERROR`

Error-cause code constants. The provider attaches one of these to
`Error.cause.code` when the relevant failure mode is detected.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-equity-prices` ^1.0.0

### Environment Variables

- `ALPHA_VANTAGE_API_KEY` — Alpha Vantage API key (free tier signup at
  https://www.alphavantage.co/support/#api-key).
- `ALPHA_VANTAGE_BASE_URL` — optional base URL override.
