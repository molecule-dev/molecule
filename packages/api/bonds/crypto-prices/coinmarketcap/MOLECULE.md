# @molecule/api-crypto-prices-coinmarketcap

CoinMarketCap crypto-prices provider for molecule.dev.

Implements the `CryptoPricesProvider` interface against the CoinMarketCap
Pro v1 API (`https://pro-api.coinmarketcap.com/v1`). Authentication is
required: set the `COINMARKETCAP_API_KEY` environment variable (or pass
`apiKey` to {@link createProvider}); the provider sends it in the
`X-CMC_PRO_API_KEY` header on every request.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-crypto-prices'
import { provider } from '@molecule/api-crypto-prices-coinmarketcap'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-crypto-prices-coinmarketcap @molecule/api-crypto-prices @molecule/api-secrets
```

## API

### Interfaces

#### `CoinMarketCapCryptoPricesConfig`

Configuration options for the CoinMarketCap crypto-prices provider.

The CoinMarketCap Pro API
(`https://pro-api.coinmarketcap.com/v1`) requires authentication, so
{@link apiKey} (or the `COINMARKETCAP_API_KEY` environment variable) must
be provided before any request is made. The key is sent in the
`X-CMC_PRO_API_KEY` header.

```typescript
interface CoinMarketCapCryptoPricesConfig {
  /**
   * Base URL override. Defaults to `'https://pro-api.coinmarketcap.com/v1'`.
   */
  baseUrl?: string

  /**
   * CoinMarketCap Pro API key. Sent in the `X-CMC_PRO_API_KEY` header on
   * every request. The provider does not include the key in any error
   * messages.
   */
  apiKey?: string

  /**
   * Request timeout in milliseconds. Defaults to `10000`.
   */
  timeout?: number
}
```

### Classes

#### `CoinMarketCapRateLimitedError`

Error thrown by the CoinMarketCap provider when the upstream API rejects a
request with HTTP 429 (Too Many Requests).

The error never includes the configured API key (or any other secret) in
its message or properties.

### Functions

#### `createProvider(config)`

Creates a CoinMarketCap crypto-prices provider.

```typescript
function createProvider(config?: CoinMarketCapCryptoPricesConfig): CryptoPricesProvider
```

- `config` — Provider configuration. {@link CoinMarketCapCryptoPricesConfig.apiKey} (or `COINMARKETCAP_API_KEY` in `process.env`) must be set for the upstream API to accept any request.

**Returns:** A {@link CryptoPricesProvider} backed by the CoinMarketCap Pro v1 API.

### Constants

#### `cryptoPricesCoinmarketcapSecretDefinitions`

Secret definitions required by the CoinMarketCap crypto-prices bond.

```typescript
const cryptoPricesCoinmarketcapSecretDefinitions: SecretDefinition[]
```

#### `provider`

The provider implementation, lazily initialized on first use.

Reads `COINMARKETCAP_API_KEY` and `COINMARKETCAP_BASE_URL` from
environment variables. The CMC Pro API requires authentication, so an
API key must be configured before any request is made; otherwise the
upstream server returns 401.

```typescript
const provider: CryptoPricesProvider
```

#### `RATE_LIMITED`

Stable error code emitted by the CoinMarketCap provider when the upstream
API returns HTTP 429 (Too Many Requests).

Catch on this constant rather than parsing error messages — the message
text is for humans only.

```typescript
const RATE_LIMITED: "RATE_LIMITED"
```

## Core Interface
Implements `@molecule/api-crypto-prices` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-crypto-prices'
import { provider } from '@molecule/api-crypto-prices-coinmarketcap'

export function setupCryptoPricesCoinmarketcap(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-crypto-prices` ^1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `COINMARKETCAP_API_KEY` *(required)* — CoinMarketCap API key
  - Setup: Sign up for the CoinMarketCap API (free tier available) and copy your key.
  - Get it here: [https://pro.coinmarketcap.com/account](https://pro.coinmarketcap.com/account)

### Runtime Dependencies

- `@molecule/api-crypto-prices`
- `@molecule/api-secrets`

- **The id round-trip holds.** An id from `listCoins()` /
  `listSupportedSymbols()` — CMC's NUMERIC id (`'1'` for BTC) — is a valid
  input to `getPrice()` / `getHistorical()` / `getMarketStats()`, per the
  core {@link CoinId} contract. Those methods dispatch on the id shape: a
  purely-numeric id is sent as CoinMarketCap's `id=` query parameter,
  anything else as `symbol=` — so passing a ticker symbol (`'BTC'`) works
  too.
- The bond does not fail fast on a missing key: without
  `COINMARKETCAP_API_KEY` the auth header is simply omitted and every call
  surfaces CoinMarketCap's raw HTTP 401. `COINMARKETCAP_BASE_URL` (optional)
  overrides the Pro v1 endpoint.
- HTTP 429 raises `CoinMarketCapRateLimitedError` (code `RATE_LIMITED`,
  `retryAfterSeconds` parsed from `Retry-After`) — catch on the code, not
  the message.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] A known coin's spot price renders in the UI: `getPrice(id, 'usd')` (id
  from `listCoins()`/`listSupportedSymbols()`, never a hardcoded provider id)
  returns a `CoinPriceQuote` with a PLAUSIBLE `price` (BTC is thousands of
  USD, not 0/null/NaN) and it shows on screen, not "—".
- [ ] The market list shows DISTINCT prices: `listCoins()` renders multiple
  `CoinMarketRow`s and each coin's `price` is its own value (BTC ≠ ETH, not a
  repeated copy), with `symbol`/`name` matching the row.
- [ ] If a chart/detail screen is exposed, `getHistorical(id, days)` returns a
  series of `CoinPricePoint` `(ts, price)` samples in chronological order that
  render as a line/spark chart — not a single point or an empty box.
- [ ] Switching the quote currency (USD→EUR) re-fetches with the new
  `vsCurrency` and the displayed values CHANGE, shown with the right symbol
  and precision ($/€, not a raw float).
- [ ] Prices refresh: a later `getPrice`/`listCoins` can return a different
  `price`/`change24h` and the UI updates (or shows an "as of" time from
  `asOf`) — it isn't frozen at first paint.
- [ ] Edge/error: an unknown coin id or symbol surfaces a clear "not found" in
  the UI, and a provider/rate-limit failure degrades gracefully (stale-but-
  shown or an empty state) — never a crash, blank, or NaN.
- [ ] The provider API key (if the bonded provider needs one) stays
  server-side: the browser calls the app's own endpoint, never the upstream
  API directly, and that endpoint isn't an open proxy for arbitrary
  coin/currency params.
