# @molecule/api-crypto-prices

Provider-agnostic crypto-prices interface for molecule.dev.

Defines the {@link CryptoPricesProvider} interface for cryptocurrency
price lookups. Bond packages (CoinGecko, CoinMarketCap, Binance, etc.)
implement this interface. Application code uses the convenience
functions (`listCoins`, `getPrice`, `getHistorical`,
`listSupportedSymbols`, `getMarketStats`) which delegate to the bonded
provider.

Quote currencies (`'usd'`, `'eur'`, `'btc'`, ...) are conventionally
lower-case to match common upstream APIs.

## Quick Start

```typescript
import { setProvider, getPrice, listCoins } from '@molecule/api-crypto-prices'
import { provider as coingecko } from '@molecule/api-crypto-prices-coingecko'

setProvider(coingecko)
const top = await listCoins({ limit: 50 })
const btc = await getPrice('bitcoin', 'usd')
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-crypto-prices @molecule/api-bond @molecule/api-i18n
```

## API

### Interfaces

#### `CoinMarketRow`

Human-readable summary of a single coin, including the latest spot
price expressed in {@link CoinMarketRow.vsCurrency}.

```typescript
interface CoinMarketRow {
  /**
   * Provider-specific coin identifier (e.g. `'bitcoin'`).
   */
  id: CoinId

  /**
   * Ticker symbol (e.g. `'BTC'`).
   */
  symbol: CoinSymbol

  /**
   * Human-readable name (e.g. `'Bitcoin'`).
   */
  name: CoinMarketRowName

  /**
   * Quote currency the {@link price} and other monetary fields are
   * expressed in (e.g. `'usd'`).
   */
  vsCurrency: VsCurrency

  /**
   * Latest spot price in {@link vsCurrency} per 1 unit of the coin.
   */
  price: number

  /**
   * Market-cap rank (1 = largest). `null` if the provider does not
   * supply a ranking for this coin.
   */
  rank: number | null

  /**
   * 24-hour percent change in {@link price} (e.g. `-3.41` for -3.41%).
   * `null` if the provider does not supply 24h change for this coin.
   */
  change24h: number | null

  /**
   * Timestamp the row was observed/published.
   */
  asOf: Date
}
```

#### `CoinMarketStats`

Aggregate market statistics for a coin (volume, market-cap, etc.).

```typescript
interface CoinMarketStats {
  /**
   * Provider-specific coin identifier (e.g. `'bitcoin'`).
   */
  id: CoinId

  /**
   * Quote currency (e.g. `'usd'`).
   */
  vsCurrency: VsCurrency

  /**
   * Latest spot price in {@link vsCurrency}.
   */
  price: number

  /**
   * Total market capitalization in {@link vsCurrency}, or `null` if the
   * provider does not supply it.
   */
  marketCap: number | null

  /**
   * 24-hour rolling traded volume in {@link vsCurrency}, or `null` if
   * the provider does not supply it.
   */
  volume24h: number | null

  /**
   * Circulating supply in coin units, or `null` if the provider does
   * not supply it.
   */
  circulatingSupply: number | null

  /**
   * Total supply in coin units, or `null` if unbounded / not supplied.
   */
  totalSupply: number | null

  /**
   * 24-hour percent change in {@link price} (e.g. `-3.41` for -3.41%).
   * `null` if the provider does not supply it.
   */
  change24h: number | null

  /**
   * Timestamp the snapshot was observed/published.
   */
  asOf: Date
}
```

#### `CoinPricePoint`

One sample of a historical price series.

```typescript
interface CoinPricePoint {
  /**
   * Timestamp of the sample.
   */
  ts: Date

  /**
   * Spot price in the requested vs-currency at {@link ts}.
   */
  price: number
}
```

#### `CoinPriceQuote`

Single price quote for a coin at a point in time.

```typescript
interface CoinPriceQuote {
  /**
   * Provider-specific coin identifier (e.g. `'bitcoin'`).
   */
  id: CoinId

  /**
   * Quote currency (e.g. `'usd'`).
   */
  vsCurrency: VsCurrency

  /**
   * Spot price in {@link vsCurrency} per 1 unit of the coin.
   */
  price: number

  /**
   * 24-hour percent change in {@link price} (e.g. `-3.41` for -3.41%).
   * `null` if the provider does not supply 24h change.
   */
  change24h: number | null

  /**
   * Timestamp the quote was observed/published.
   */
  asOf: Date
}
```

#### `CryptoPricesProvider`

Crypto-prices provider interface.

All crypto-price providers (CoinGecko, CoinMarketCap, Binance, etc.)
implement this interface. The interface is deliberately minimal so
providers with very different upstream APIs can satisfy it identically.

```typescript
interface CryptoPricesProvider {
  /**
   * Lists coins ranked by market-cap (or by {@link ListCoinsOptions.order}).
   *
   * @param options - Pagination, sort, and quote-currency options.
   * @returns Array of coin market rows.
   */
  listCoins(options?: ListCoinsOptions): Promise<CoinMarketRow[]>

  /**
   * Gets the latest spot price for a single coin.
   *
   * @param id - Provider-specific coin identifier (e.g. `'bitcoin'`).
   * @param vsCurrency - Quote currency. Defaults to `'usd'` when omitted.
   * @returns Single quote with price and 24h change.
   */
  getPrice(id: CoinId, vsCurrency?: VsCurrency): Promise<CoinPriceQuote>

  /**
   * Gets a historical price series for a coin over the last
   * {@link days} days.
   *
   * @param id - Provider-specific coin identifier.
   * @param days - Window size in days back from now (e.g. `7`, `30`).
   * @param vsCurrency - Quote currency. Defaults to `'usd'` when omitted.
   * @returns Array of `(ts, price)` samples in chronological order.
   */
  getHistorical(
    id: CoinId,
    days: HistoricalDays,
    vsCurrency?: VsCurrency,
  ): Promise<CoinPricePoint[]>

  /**
   * Lists every coin symbol the provider currently supports.
   *
   * Implementations SHOULD return values usable as {@link CoinId} for
   * other methods on this interface (i.e. provider-specific identifiers,
   * not necessarily ticker symbols).
   *
   * @returns Array of coin identifiers the provider can quote.
   */
  listSupportedSymbols(): Promise<CoinId[]>

  /**
   * Returns aggregate market statistics for a single coin (price,
   * market-cap, volume, supply).
   *
   * @param id - Provider-specific coin identifier.
   * @param vsCurrency - Quote currency. Defaults to `'usd'` when omitted.
   * @returns Aggregate market statistics snapshot.
   */
  getMarketStats(id: CoinId, vsCurrency?: VsCurrency): Promise<CoinMarketStats>
}
```

#### `ListCoinsOptions`

Options accepted by {@link CryptoPricesProvider.listCoins}.

```typescript
interface ListCoinsOptions {
  /**
   * Quote currency to express prices in. Defaults to `'usd'` when omitted.
   */
  vsCurrency?: VsCurrency

  /**
   * Maximum number of rows to return. Implementations MAY clamp this
   * value to whatever upper bound their upstream API enforces.
   */
  limit?: number

  /**
   * Page number (1-indexed) when paginating. Implementations that do
   * not paginate MAY ignore this.
   */
  page?: number

  /**
   * Sort order. `'market-cap-desc'` (the default) lists largest by
   * market-cap first; `'market-cap-asc'` reverses that.
   */
  order?: 'market-cap-desc' | 'market-cap-asc'
}
```

### Types

#### `CoinId`

Provider-specific coin identifier (e.g. CoinGecko's `'bitcoin'`,
CoinMarketCap's numeric `'1'`).

Kept as a plain `string` alias rather than a string-literal union so
providers can expose whatever identifier scheme their upstream uses.
Use {@link CryptoPricesProvider.listSupportedSymbols} to discover what a
given provider supports at runtime.

```typescript
type CoinId = string
```

#### `CoinMarketRowName`

Friendly display name for a coin. Aliased so future i18n / locale
variants can attach without breaking the {@link CoinMarketRow} shape.

```typescript
type CoinMarketRowName = string
```

#### `CoinSymbol`

Ticker symbol (e.g. `'BTC'`, `'ETH'`).

Symbols are not globally unique across providers — multiple coins can
share a ticker. Prefer {@link CoinId} when an unambiguous reference is
required.

```typescript
type CoinSymbol = string
```

#### `HistoricalDays`

Time range for {@link CryptoPricesProvider.getHistorical}.

Days are represented as a positive integer count of days back from
"now" (e.g. `7` = last week, `30` = last month). Providers that
support extra granularity (hourly, 5-minute) typically pick one
automatically based on this range.

```typescript
type HistoricalDays = number
```

#### `VsCurrency`

ISO 4217 fiat currency code or another crypto symbol used as the
quote currency for a price (e.g. `'usd'`, `'eur'`, `'btc'`).

Conventionally lower-case to match common upstream APIs (CoinGecko,
CoinMarketCap) which expect lower-case quote codes.

```typescript
type VsCurrency = string
```

### Functions

#### `getHistorical(id, days, vsCurrency)`

Gets a historical price series for a coin over the last `days` days.

```typescript
function getHistorical(id: string, days: number, vsCurrency?: string): Promise<CoinPricePoint[]>
```

- `id` — Provider-specific coin identifier.
- `days` — Window size in days back from now (e.g. `7`, `30`).
- `vsCurrency` — Quote currency. Defaults to `'usd'` when omitted.

**Returns:** Array of `(ts, price)` samples in chronological order.

#### `getMarketStats(id, vsCurrency)`

Returns aggregate market statistics for a single coin (price, market-cap,
volume, supply).

```typescript
function getMarketStats(id: string, vsCurrency?: string): Promise<CoinMarketStats>
```

- `id` — Provider-specific coin identifier.
- `vsCurrency` — Quote currency. Defaults to `'usd'` when omitted.

**Returns:** Aggregate market statistics snapshot.

#### `getPrice(id, vsCurrency)`

Gets the latest spot price for a single coin.

```typescript
function getPrice(id: string, vsCurrency?: string): Promise<CoinPriceQuote>
```

- `id` — Provider-specific coin identifier (e.g. `'bitcoin'`).
- `vsCurrency` — Quote currency. Defaults to `'usd'` when omitted.

**Returns:** Single quote with price and 24h change.

#### `getProvider()`

Retrieves the bonded crypto-prices provider, throwing if none is
configured.

```typescript
function getProvider(): CryptoPricesProvider
```

**Returns:** The bonded crypto-prices provider.

#### `hasProvider()`

Checks whether a crypto-prices provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a crypto-prices provider is bonded.

#### `listCoins(options)`

Lists coins ranked by market-cap (or by the supplied `order`).

```typescript
function listCoins(options?: ListCoinsOptions): Promise<CoinMarketRow[]>
```

- `options` — Pagination, sort, and quote-currency options.

**Returns:** Array of coin market rows.

#### `listSupportedSymbols()`

Lists every coin identifier the bonded provider currently supports.

```typescript
function listSupportedSymbols(): Promise<string[]>
```

**Returns:** Array of provider-specific coin identifiers.

#### `setProvider(provider)`

Registers a crypto-prices provider as the active singleton. Called by
bond packages (e.g. `@molecule/api-crypto-prices-coingecko`) during
application startup.

```typescript
function setProvider(provider: CryptoPricesProvider): void
```

- `provider` — The crypto-prices provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| CoinGecko | `@molecule/api-crypto-prices-coingecko` |
| CoinMarketCap | `@molecule/api-crypto-prices-coinmarketcap` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-i18n`

- **Server-side only.** Price lookups run in API handlers/jobs — provider
  API keys are secrets and never reach the browser. Expose an app endpoint
  that returns exactly the data the UI needs.
- **`CoinId` is provider-specific — never hardcode one provider's ids.**
  `'bitcoin'` is a CoinGecko id; other providers key coins differently.
  Resolve ids at runtime (`listCoins()` / `listSupportedSymbols()`) or store
  the id the bonded provider returned, so swapping bonds doesn't silently
  break lookups.
- **Cache aggressively.** Free upstream tiers are heavily rate-limited — a
  `getPrice()` per page render gets the app throttled. Cache quotes
  server-side (seconds–minutes of staleness is fine for display) and prefer
  one `listCoins()` over N `getPrice()` calls.
- `getHistorical(id, days)` takes a positive integer count of days back from
  now (`7`, `30`, `365`) — not a date or a range string.
