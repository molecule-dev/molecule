/**
 * Type definitions for the equity-prices core interface.
 *
 * @module
 */

/**
 * Equity / ETF / fund symbol ticker (e.g. `'AAPL'`, `'VOO'`, `'SPY'`).
 *
 * Kept as a plain `string` alias rather than a string-literal union so
 * providers can support whatever set of symbols / exchanges they expose.
 * Use {@link EquityPricesProvider.searchSymbol} to discover what a given
 * provider supports at runtime.
 */
export type EquitySymbol = string

/**
 * Exchange identifier (e.g. `'NASDAQ'`, `'NYSE'`, `'LSE'`, `'TSE'`).
 *
 * Plain string for the same reason as {@link EquitySymbol} — providers
 * differ widely on which exchanges they cover.
 */
export type ExchangeCode = string

/**
 * ISO 4217 three-letter currency code (e.g. `'USD'`, `'EUR'`, `'JPY'`).
 *
 * Quotes from a provider may be denominated in any currency the underlying
 * exchange supports.
 */
export type CurrencyCode = string

/**
 * Supported historical price ranges.
 *
 * Providers SHOULD support at least `'1d'`, `'1m'`, and `'1y'`. Providers
 * MAY throw {@link Error} if a requested range is not supported.
 */
export type EquityHistoricalRange = '1d' | '5d' | '1m' | '3m' | '6m' | '1y' | '5y' | 'max'

/**
 * A single point-in-time equity price quote.
 */
export interface EquityQuote {
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

/**
 * A single historical price bar (close-only by default; providers may
 * extend with OHLCV via additional optional fields if useful, but the
 * canonical contract is `{ ts, close }`).
 */
export interface EquityHistoricalBar {
  /**
   * Bar timestamp (period start; daily bars are conventionally midnight UTC).
   */
  ts: Date

  /**
   * Closing price for the bar in the symbol's native currency.
   */
  close: number
}

/**
 * Optional fundamentals snapshot. All fields are optional because providers
 * vary in coverage; consumers MUST treat missing fields as "unknown" rather
 * than zero.
 */
export interface EquityFundamentals {
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

/**
 * A symbol-search result row.
 */
export interface EquitySymbolMatch {
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

/**
 * Equity / ETF / fund price + fundamentals provider interface.
 *
 * All providers (Alpha Vantage, IEX Cloud, Polygon.io, fixtures, etc.)
 * implement this interface. The interface is deliberately minimal so
 * providers with very different upstream APIs can satisfy it identically.
 */
export interface EquityPricesProvider {
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
   * @returns {@link EquityFundamentals} snapshot.
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
