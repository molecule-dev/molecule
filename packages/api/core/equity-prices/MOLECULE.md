# @molecule/api-equity-prices

Provider-agnostic equity-prices interface for molecule.dev.

Defines the `EquityPricesProvider` interface for stock / ETF / fund
quotes, historical bars, fundamentals, and symbol search. Bond packages
(Alpha Vantage, IEX Cloud, Polygon.io, etc.) implement this interface.
Application code uses the convenience functions (`getQuote`,
`getHistorical`, `getFundamentals`, `searchSymbol`,
`listSupportedExchanges`) which delegate to the bonded provider.

Quotes carry an explicit ISO 4217 currency so multi-exchange callers can
reconcile prices across markets. Symbols and exchange codes are kept as
plain strings so providers can support whatever catalogue they expose.

## Quick Start

```typescript
import { setProvider, getQuote, getHistorical } from '@molecule/api-equity-prices'
import { provider as alphaVantage } from '@molecule/api-equity-prices-alpha-vantage'

setProvider(alphaVantage)
const quote = await getQuote('AAPL')
const bars = await getHistorical('AAPL', '1y')
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-equity-prices @molecule/api-bond @molecule/api-i18n
```

## API

### Interfaces

#### `EquityFundamentals`

Optional fundamentals snapshot. All fields are optional because providers
vary in coverage; consumers MUST treat missing fields as "unknown" rather
than zero.

```typescript
interface EquityFundamentals {
  /**
   * Equity / ETF / fund ticker symbol the fundamentals describe.
   */
  symbol: EquitySymbol

  /**
   * Market capitalization in major units of {@link currency}, if known.
   */
  marketCap?: number

  /**
   * Trailing price/earnings ratio, if known.
   */
  peRatio?: number

  /**
   * Trailing earnings per share in {@link currency}, if known.
   */
  eps?: number

  /**
   * Trailing dividend yield as a fraction (e.g. `0.012` for 1.2%), if known.
   */
  dividendYield?: number

  /**
   * Currency the monetary fundamentals are denominated in.
   */
  currency?: CurrencyCode
}
```

#### `EquityHistoricalBar`

A single historical price bar (close-only by default; providers may
extend with OHLCV via additional optional fields if useful, but the
canonical contract is `{ ts, close }`).

```typescript
interface EquityHistoricalBar {
  /**
   * Bar timestamp (period start; daily bars are conventionally midnight UTC).
   */
  ts: Date

  /**
   * Closing price for the bar in the symbol's native currency.
   */
  close: number
}
```

#### `EquityPricesProvider`

Equity / ETF / fund price + fundamentals provider interface.

All providers (Alpha Vantage, IEX Cloud, Polygon.io, fixtures, etc.)
implement this interface. The interface is deliberately minimal so
providers with very different upstream APIs can satisfy it identically.

```typescript
interface EquityPricesProvider {
  /**
   * Returns the latest available quote for {@link symbol}.
   *
   * @param symbol - Ticker symbol to quote.
   * @returns Latest {@link EquityQuote}.
   */
  getQuote(symbol: EquitySymbol): Promise<EquityQuote>

  /**
   * Returns historical close-price bars for {@link symbol} over
   * {@link range}. Bars are returned in ascending chronological order.
   *
   * @param symbol - Ticker symbol to load history for.
   * @param range - Time range to cover.
   * @returns Array of {@link EquityHistoricalBar} in ascending order.
   */
  getHistorical(symbol: EquitySymbol, range: EquityHistoricalRange): Promise<EquityHistoricalBar[]>

  /**
   * Returns trailing fundamentals for {@link symbol}. Providers without
   * fundamentals coverage MAY return an object with only the {@link
   * EquityFundamentals.symbol} field populated.
   *
   * @param symbol - Ticker symbol to load fundamentals for.
   * @returns snapshot.
   */
  getFundamentals(symbol: EquitySymbol): Promise<EquityFundamentals>

  /**
   * Searches the provider's symbol catalogue for matches against
   * {@link query} (matched against ticker and/or company name).
   *
   * @param query - Free-text search string.
   * @returns Array of {@link EquitySymbolMatch}, possibly empty.
   */
  searchSymbol(query: string): Promise<EquitySymbolMatch[]>

  /**
   * Lists the exchanges this provider currently supports. Used by callers
   * to determine which markets they can query.
   *
   * @returns Array of exchange identifiers (e.g. `'NASDAQ'`, `'NYSE'`).
   */
  listSupportedExchanges(): Promise<ExchangeCode[]>
}
```

#### `EquityQuote`

A single point-in-time equity price quote.

```typescript
interface EquityQuote {
  /**
   * Equity / ETF / fund ticker symbol.
   */
  symbol: EquitySymbol

  /**
   * Latest traded price (or last close if market is closed), expressed in
   * {@link currency} as a plain `number` (major units, e.g. dollars).
   */
  price: number

  /**
   * ISO 4217 currency code the {@link price} is denominated in.
   */
  currency: CurrencyCode

  /**
   * Timestamp the quote was observed.
   */
  ts: Date

  /**
   * Exchange the symbol is listed on. Optional — not every provider exposes
   * the exchange consistently.
   */
  exchange?: ExchangeCode
}
```

#### `EquitySymbolMatch`

A symbol-search result row.

```typescript
interface EquitySymbolMatch {
  /**
   * Ticker symbol.
   */
  symbol: EquitySymbol

  /**
   * Human-readable security name (e.g. `'Apple Inc.'`).
   */
  name: string

  /**
   * Exchange the symbol is listed on, if known.
   */
  exchange?: ExchangeCode

  /**
   * Currency the security trades in, if known.
   */
  currency?: CurrencyCode
}
```

### Types

#### `CurrencyCode`

ISO 4217 three-letter currency code (e.g. `'USD'`, `'EUR'`, `'JPY'`).

Quotes from a provider may be denominated in any currency the underlying
exchange supports.

```typescript
type CurrencyCode = string
```

#### `EquityHistoricalRange`

Supported historical price ranges.

Providers SHOULD support at least `'1d'`, `'1m'`, and `'1y'`. Providers
MAY throw {@link Error} if a requested range is not supported.

```typescript
type EquityHistoricalRange = '1d' | '5d' | '1m' | '3m' | '6m' | '1y' | '5y' | 'max'
```

#### `EquitySymbol`

Equity / ETF / fund symbol ticker (e.g. `'AAPL'`, `'VOO'`, `'SPY'`).

Kept as a plain `string` alias rather than a string-literal union so
providers can support whatever set of symbols / exchanges they expose.
Use {@link EquityPricesProvider.searchSymbol} to discover what a given
provider supports at runtime.

```typescript
type EquitySymbol = string
```

#### `ExchangeCode`

Exchange identifier (e.g. `'NASDAQ'`, `'NYSE'`, `'LSE'`, `'TSE'`).

Plain string for the same reason as {@link EquitySymbol} — providers
differ widely on which exchanges they cover.

```typescript
type ExchangeCode = string
```

### Functions

#### `getFundamentals(symbol)`

Returns trailing fundamentals for {@link symbol} using the bonded
provider.

```typescript
function getFundamentals(symbol: string): Promise<EquityFundamentals>
```

- `symbol` — Ticker symbol to load fundamentals for.

**Returns:** snapshot.

#### `getHistorical(symbol, range)`

Returns historical close-price bars for {@link symbol} over {@link range}
using the bonded provider. Bars are returned in ascending chronological
order.

```typescript
function getHistorical(symbol: string, range: EquityHistoricalRange): Promise<EquityHistoricalBar[]>
```

- `symbol` — Ticker symbol to load history for.
- `range` — Time range to cover.

**Returns:** Array of {@link EquityHistoricalBar} in ascending order.

#### `getProvider()`

Retrieves the bonded equity-prices provider, throwing if none is
configured.

```typescript
function getProvider(): EquityPricesProvider
```

**Returns:** The bonded equity-prices provider.

#### `getQuote(symbol)`

Returns the latest available quote for {@link symbol} using the bonded
provider.

```typescript
function getQuote(symbol: string): Promise<EquityQuote>
```

- `symbol` — Ticker symbol to quote.

**Returns:** Latest {@link EquityQuote}.

#### `hasProvider()`

Checks whether an equity-prices provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if an equity-prices provider is bonded.

#### `listSupportedExchanges()`

Lists the exchanges the bonded provider currently supports.

```typescript
function listSupportedExchanges(): Promise<string[]>
```

**Returns:** Array of exchange identifiers.

#### `searchSymbol(query)`

Searches the bonded provider's symbol catalogue for matches against
{@link query}.

```typescript
function searchSymbol(query: string): Promise<EquitySymbolMatch[]>
```

- `query` — Free-text search string.

**Returns:** Array of {@link EquitySymbolMatch}, possibly empty.

#### `setProvider(provider)`

Registers an equity-prices provider as the active singleton. Called by
bond packages (e.g. `@molecule/api-equity-prices-alpha-vantage`) during
application startup.

```typescript
function setProvider(provider: EquityPricesProvider): void
```

- `provider` — The equity-prices provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| Alpha Vantage Equity Prices | `@molecule/api-equity-prices-alpha-vantage` |
| IEX Cloud | `@molecule/api-equity-prices-iex` |
| Polygon.io Equity Prices | `@molecule/api-equity-prices-polygon` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-i18n`
