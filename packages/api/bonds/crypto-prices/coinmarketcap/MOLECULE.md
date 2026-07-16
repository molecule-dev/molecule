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

- `config` — Provider configuration. {@link CoinMarketCapCryptoPricesConfig.apiKey}

**Returns:** A {@link CryptoPricesProvider} backed by the CoinMarketCap Pro
 *   v1 API.

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

- **Pass ticker SYMBOLS (`'BTC'`, `'ETH'`) to `getPrice()` / `getHistorical()`
  / `getMarketStats()` — NOT the ids this bond returns.** Those methods send
  the id as CoinMarketCap's `symbol=` query parameter, while `listCoins()`
  and `listSupportedSymbols()` return CMC's NUMERIC ids (`'1'` for BTC).
  Feeding a returned id back into a quote method fails upstream (HTTP 400 /
  "no price data") — the core contract's id round-trip does not currently
  hold for this bond. Key everything by ticker symbol.
- The bond does not fail fast on a missing key: without
  `COINMARKETCAP_API_KEY` the auth header is simply omitted and every call
  surfaces CoinMarketCap's raw HTTP 401. `COINMARKETCAP_BASE_URL` (optional)
  overrides the Pro v1 endpoint.
- HTTP 429 raises `CoinMarketCapRateLimitedError` (code `RATE_LIMITED`,
  `retryAfterSeconds` parsed from `Retry-After`) — catch on the code, not
  the message.
