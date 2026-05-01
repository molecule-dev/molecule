/**
 * Type definitions for the crypto-prices core interface.
 *
 * @module
 */

/**
 * Provider-specific coin identifier (e.g. CoinGecko's `'bitcoin'`,
 * CoinMarketCap's numeric `'1'`).
 *
 * Kept as a plain `string` alias rather than a string-literal union so
 * providers can expose whatever identifier scheme their upstream uses.
 * Use {@link CryptoPricesProvider.listSupportedSymbols} to discover what a
 * given provider supports at runtime.
 */
export type CoinId = string

/**
 * Ticker symbol (e.g. `'BTC'`, `'ETH'`).
 *
 * Symbols are not globally unique across providers — multiple coins can
 * share a ticker. Prefer {@link CoinId} when an unambiguous reference is
 * required.
 */
export type CoinSymbol = string

/**
 * ISO 4217 fiat currency code or another crypto symbol used as the
 * quote currency for a price (e.g. `'usd'`, `'eur'`, `'btc'`).
 *
 * Conventionally lower-case to match common upstream APIs (CoinGecko,
 * CoinMarketCap) which expect lower-case quote codes.
 */
export type VsCurrency = string

/**
 * Human-readable summary of a single coin, including the latest spot
 * price expressed in {@link CoinMarketRow.vsCurrency}.
 */
export interface CoinMarketRow {
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

/**
 * Friendly display name for a coin. Aliased so future i18n / locale
 * variants can attach without breaking the {@link CoinMarketRow} shape.
 */
export type CoinMarketRowName = string

/**
 * Single price quote for a coin at a point in time.
 */
export interface CoinPriceQuote {
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

/**
 * One sample of a historical price series.
 */
export interface CoinPricePoint {
  /**
   * Timestamp of the sample.
   */
  ts: Date

  /**
   * Spot price in the requested vs-currency at {@link ts}.
   */
  price: number
}

/**
 * Aggregate market statistics for a coin (volume, market-cap, etc.).
 */
export interface CoinMarketStats {
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

/**
 * Options accepted by {@link CryptoPricesProvider.listCoins}.
 */
export interface ListCoinsOptions {
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

/**
 * Time range for {@link CryptoPricesProvider.getHistorical}.
 *
 * Days are represented as a positive integer count of days back from
 * "now" (e.g. `7` = last week, `30` = last month). Providers that
 * support extra granularity (hourly, 5-minute) typically pick one
 * automatically based on this range.
 */
export type HistoricalDays = number

/**
 * Crypto-prices provider interface.
 *
 * All crypto-price providers (CoinGecko, CoinMarketCap, Binance, etc.)
 * implement this interface. The interface is deliberately minimal so
 * providers with very different upstream APIs can satisfy it identically.
 */
export interface CryptoPricesProvider {
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
