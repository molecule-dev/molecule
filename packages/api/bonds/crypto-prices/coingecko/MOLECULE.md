# @molecule/api-crypto-prices-coingecko

CoinGecko crypto-prices provider for molecule.dev.

Implements the `CryptoPricesProvider` interface against the CoinGecko v3
API. The public endpoint (`https://api.coingecko.com/api/v3`) is keyless
and free for personal / non-commercial use, with conservative
rate-limits. Setting the `COINGECKO_API_KEY` environment variable
switches to the Pro endpoint (`https://pro-api.coingecko.com/api/v3`)
and authenticates with the `x-cg-pro-api-key` header.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-crypto-prices'
import { provider } from '@molecule/api-crypto-prices-coingecko'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-crypto-prices-coingecko @molecule/api-crypto-prices
```

## API

### Interfaces

#### `CoinGeckoCryptoPricesConfig`

Configuration options for the CoinGecko crypto-prices provider.

The CoinGecko public API
(`https://api.coingecko.com/api/v3`) is keyless and free for personal /
non-commercial use, so all fields are optional. Setting {@link apiKey}
switches the provider to the CoinGecko Pro endpoint
(`https://pro-api.coingecko.com/api/v3`) and authenticates with the
`x-cg-pro-api-key` header.

```typescript
interface CoinGeckoCryptoPricesConfig {
  /**
   * Base URL override. Defaults to `'https://api.coingecko.com/api/v3'` when
   * {@link apiKey} is omitted, or `'https://pro-api.coingecko.com/api/v3'`
   * when {@link apiKey} is set.
   */
  baseUrl?: string

  /**
   * CoinGecko Pro API key. When set, the provider uses the Pro host and
   * sends the `x-cg-pro-api-key` header. The free public endpoint requires
   * no key.
   */
  apiKey?: string

  /**
   * Request timeout in milliseconds. Defaults to `10000`.
   */
  timeout?: number
}
```

### Classes

#### `CoinGeckoRateLimitedError`

Error thrown by the CoinGecko provider when the upstream API rejects a
request with HTTP 429 (Too Many Requests).

The error never includes the configured API key (or any other secret) in
its message or properties.

### Functions

#### `createProvider(config)`

Creates a CoinGecko crypto-prices provider.

```typescript
function createProvider(config?: CoinGeckoCryptoPricesConfig): CryptoPricesProvider
```

- `config` — Provider configuration. All fields are optional.

**Returns:** A {@link CryptoPricesProvider} backed by the CoinGecko v3 API.

### Constants

#### `provider`

The provider implementation, lazily initialized on first use.

Reads `COINGECKO_API_KEY` and `COINGECKO_BASE_URL` from environment
variables. When `COINGECKO_API_KEY` is set the provider routes traffic
to the Pro endpoint and authenticates with the `x-cg-pro-api-key` header;
the public free tier requires no key.

```typescript
const provider: CryptoPricesProvider
```

#### `RATE_LIMITED`

Stable error code emitted by the CoinGecko provider when the upstream API
returns HTTP 429 (Too Many Requests).

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
import { provider } from '@molecule/api-crypto-prices-coingecko'

export function setupCryptoPricesCoingecko(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-crypto-prices` ^1.0.0

### Environment Variables

- `COINGECKO_API_KEY` *(optional)* — CoinGecko Pro API key
  - Setup: Optional. Leave unset to use the free keyless public endpoint (conservative rate limits). Set a Pro key to switch to pro-api.coingecko.com with higher limits.
  - Get it here: [https://www.coingecko.com/en/api/pricing](https://www.coingecko.com/en/api/pricing)
  - Example: `CG-...`

### Runtime Dependencies

- `@molecule/api-crypto-prices`
