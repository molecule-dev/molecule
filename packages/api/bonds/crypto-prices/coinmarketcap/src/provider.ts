/**
 * CoinMarketCap implementation of {@link CryptoPricesProvider}.
 *
 * Wraps the CoinMarketCap Pro v1 API
 * (`https://pro-api.coinmarketcap.com/v1`). The CMC Pro endpoint requires
 * authentication on every call; configure the key via the
 * `COINMARKETCAP_API_KEY` environment variable or
 * {@link CoinMarketCapCryptoPricesConfig.apiKey}. The key is sent in the
 * `X-CMC_PRO_API_KEY` header.
 *
 * The provider performs a structural reshape from CoinMarketCap's wire
 * format to the normalized core types — no unit conversion is needed.
 *
 * @module
 */

import type {
  CoinId,
  CoinMarketRow,
  CoinMarketStats,
  CoinPricePoint,
  CoinPriceQuote,
  CryptoPricesProvider,
  HistoricalDays,
  ListCoinsOptions,
  VsCurrency,
} from '@molecule/api-crypto-prices'

import type { CoinMarketCapCryptoPricesConfig } from './types.js'
import { CoinMarketCapRateLimitedError } from './types.js'

/** Default Pro CoinMarketCap v1 API base URL. */
const DEFAULT_BASE_URL = 'https://pro-api.coinmarketcap.com/v1'

/** Default request timeout, in milliseconds. */
const DEFAULT_TIMEOUT = 10_000

/** Default vs-currency used when the caller omits the argument. */
const DEFAULT_VS_CURRENCY = 'usd'

/** Default page size used by {@link CryptoPricesProvider.listCoins}. */
const DEFAULT_LIST_LIMIT = 100

/** Default page used by {@link CryptoPricesProvider.listCoins}. */
const DEFAULT_LIST_PAGE = 1

/**
 * Maximum `limit` value accepted by `/cryptocurrency/listings/latest`.
 *
 * Used by {@link CryptoPricesProvider.listSupportedSymbols} when paginating.
 */
const LISTINGS_MAX_LIMIT = 5000

/**
 * Single quote sub-object inside a CMC `/cryptocurrency/quotes/latest` row.
 */
interface CmcQuoteData {
  /** Spot price in the requested vs-currency. */
  price: number
  /** 24-hour rolling traded volume in the requested vs-currency. */
  volume_24h?: number | null
  /** 24-hour percent change in price. */
  percent_change_24h?: number | null
  /** Market capitalization in the requested vs-currency. */
  market_cap?: number | null
  /** ISO 8601 timestamp of the last update for this quote. */
  last_updated?: string
}

/**
 * Single coin row from CMC `/cryptocurrency/quotes/latest`. Only the fields
 * the provider maps are typed.
 */
interface CmcQuoteRow {
  id: number
  name: string
  symbol: string
  cmc_rank?: number | null
  circulating_supply?: number | null
  total_supply?: number | null
  last_updated?: string
  quote: Record<string, CmcQuoteData>
}

/**
 * Top-level shape of `/cryptocurrency/quotes/latest`.
 *
 * The keys of `data` are the symbols requested via the `symbol` query
 * parameter (e.g. `BTC`).
 */
interface CmcQuotesLatestResponse {
  data: Record<string, CmcQuoteRow | CmcQuoteRow[]>
}

/**
 * Top-level shape of `/cryptocurrency/listings/latest`.
 */
interface CmcListingsLatestResponse {
  data: CmcQuoteRow[]
}

/**
 * Single sample inside a CMC `/cryptocurrency/quotes/historical` series.
 */
interface CmcHistoricalSample {
  timestamp: string
  quote: Record<string, { price: number; timestamp?: string }>
}

/**
 * Top-level shape of `/cryptocurrency/quotes/historical`.
 */
interface CmcQuotesHistoricalResponse {
  data: Record<
    string,
    | {
        symbol?: string
        quotes: CmcHistoricalSample[]
      }
    | Array<{
        symbol?: string
        quotes: CmcHistoricalSample[]
      }>
  >
}

/**
 * Internal HTTP error raised by {@link fetchJson} for non-OK statuses other
 * than 429 (rate-limit, which raises {@link CoinMarketCapRateLimitedError}).
 */
class CoinMarketCapHttpError extends Error {
  public readonly status: number

  public constructor(status: number) {
    super(`CoinMarketCap API request failed with status ${String(status)}`)
    this.name = 'CoinMarketCapHttpError'
    this.status = status
  }
}

/**
 * Parses a `Retry-After` header value into a number of seconds.
 *
 * The header may be either a delta-seconds integer or an HTTP-date.
 *
 * @param value - Raw header value (`null` when absent).
 * @returns Number of seconds to wait, or `null` if the header is absent or
 *   unparseable.
 */
const parseRetryAfter = (value: string | null): number | null => {
  if (value == null) {
    return null
  }
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return null
  }
  const asInt = Number(trimmed)
  if (Number.isFinite(asInt) && asInt >= 0) {
    return Math.floor(asInt)
  }
  const asDate = Date.parse(trimmed)
  if (Number.isFinite(asDate)) {
    const deltaMs = asDate - Date.now()
    if (deltaMs > 0) {
      return Math.ceil(deltaMs / 1000)
    }
    return 0
  }
  return null
}

/**
 * Resolves the effective base URL given the (possibly user-overridden)
 * config.
 *
 * @param config - Provider configuration.
 * @returns The base URL to call.
 */
const resolveBaseUrl = (config: CoinMarketCapCryptoPricesConfig): string => {
  if (config.baseUrl) {
    return config.baseUrl
  }
  return DEFAULT_BASE_URL
}

/**
 * Performs a GET request against CoinMarketCap and parses the JSON response.
 *
 * Adds the `X-CMC_PRO_API_KEY` header when {@link config.apiKey} is set.
 * Maps HTTP 429 responses onto {@link CoinMarketCapRateLimitedError}; all
 * other non-OK statuses raise {@link CoinMarketCapHttpError}. The provided
 * API key is never included in error messages.
 *
 * @typeParam T - Expected JSON response shape.
 * @param url - Fully-constructed request URL including query params.
 * @param config - Provider configuration (used for auth header + timeout).
 * @returns Parsed JSON body cast to `T`.
 * @throws {CoinMarketCapRateLimitedError} On HTTP 429.
 * @throws {CoinMarketCapHttpError} On any other non-OK status.
 */
const fetchJson = async <T>(url: string, config: CoinMarketCapCryptoPricesConfig): Promise<T> => {
  const timeout = config.timeout ?? DEFAULT_TIMEOUT
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (config.apiKey) {
    headers['X-CMC_PRO_API_KEY'] = config.apiKey
  }
  try {
    const response = await fetch(url, { signal: controller.signal, headers })
    if (response.status === 429) {
      const retryAfter = parseRetryAfter(response.headers.get('retry-after'))
      throw new CoinMarketCapRateLimitedError(
        'CoinMarketCap API rate limit exceeded (HTTP 429)',
        retryAfter,
      )
    }
    if (!response.ok) {
      throw new CoinMarketCapHttpError(response.status)
    }
    return (await response.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

/**
 * CoinMarketCap accepts upper-case currency codes (`USD`, `EUR`) in the
 * `convert` query param. Internally, the molecule core uses lower-case
 * (`'usd'`). This helper normalises in either direction.
 *
 * @param vsCurrency - Lower-case quote currency from a caller.
 * @returns Upper-case quote currency for the wire request.
 */
const toCmcConvert = (vsCurrency: VsCurrency): string => vsCurrency.toUpperCase()

/**
 * Picks the matching quote sub-object out of a CMC row's `quote` map. CMC
 * keys quotes by upper-case currency code, but a defensive lookup tries
 * the original casing first in case a mock/server returns lower-case.
 *
 * @param quote - The `quote` map from a CMC row.
 * @param vsCurrency - Lower-case quote currency requested.
 * @returns The matching quote data, or `undefined` if not present.
 */
const pickQuote = <T>(
  quote: Record<string, T> | undefined,
  vsCurrency: VsCurrency,
): T | undefined => {
  if (!quote) {
    return undefined
  }
  const upper = vsCurrency.toUpperCase()
  if (upper in quote) {
    return quote[upper]
  }
  if (vsCurrency in quote) {
    return quote[vsCurrency]
  }
  return undefined
}

/**
 * CMC's `/quotes/latest` returns either an object or an array under each
 * `data[SYMBOL]` key depending on whether multiple coins share that symbol.
 * This helper normalises to the first row.
 *
 * @param entry - The raw `data[SYMBOL]` value.
 * @returns The first row, or `undefined` if `entry` is empty.
 */
const firstRow = (entry: CmcQuoteRow | CmcQuoteRow[] | undefined): CmcQuoteRow | undefined => {
  if (!entry) {
    return undefined
  }
  if (Array.isArray(entry)) {
    return entry[0]
  }
  return entry
}

/**
 * CMC's `/quotes/historical` returns either an object or an array under each
 * `data[SYMBOL]` key. This helper normalises to the first row.
 *
 * @param entry - The raw `data[SYMBOL]` value.
 * @returns The first row, or `undefined` if `entry` is empty.
 */
const firstHistoricalRow = (
  entry:
    | { symbol?: string; quotes: CmcHistoricalSample[] }
    | Array<{ symbol?: string; quotes: CmcHistoricalSample[] }>
    | undefined,
): { symbol?: string; quotes: CmcHistoricalSample[] } | undefined => {
  if (!entry) {
    return undefined
  }
  if (Array.isArray(entry)) {
    return entry[0]
  }
  return entry
}

/**
 * Maps a CMC listing/quote row to a normalized {@link CoinMarketRow}.
 *
 * @param row - Raw CMC quote row.
 * @param vsCurrency - Quote currency the row was requested in.
 * @returns Normalized market row.
 */
const mapMarketRow = (row: CmcQuoteRow, vsCurrency: VsCurrency): CoinMarketRow => {
  const quote = pickQuote(row.quote, vsCurrency)
  const price = quote?.price ?? 0
  const change24h =
    quote && typeof quote.percent_change_24h === 'number' ? quote.percent_change_24h : null
  const lastUpdated = quote?.last_updated ?? row.last_updated
  return {
    id: String(row.id),
    symbol: row.symbol,
    name: row.name,
    vsCurrency,
    price,
    rank: typeof row.cmc_rank === 'number' ? row.cmc_rank : null,
    change24h,
    asOf: typeof lastUpdated === 'string' ? new Date(lastUpdated) : new Date(),
  }
}

/**
 * Builds the `/cryptocurrency/quotes/latest` URL keyed by `symbol`.
 *
 * `URLSearchParams` already URL-encodes its values, so the id is passed
 * through as-is.
 *
 * @param baseUrl - Base API URL.
 * @param id - Coin id (passed through as `symbol`).
 * @param vsCurrency - Quote currency.
 * @returns Fully-constructed request URL.
 */
const buildQuotesLatestUrl = (baseUrl: string, id: CoinId, vsCurrency: VsCurrency): string => {
  const params = new URLSearchParams({
    symbol: id,
    convert: toCmcConvert(vsCurrency),
  })
  return `${baseUrl}/cryptocurrency/quotes/latest?${params.toString()}`
}

/**
 * Builds the `/cryptocurrency/listings/latest` URL.
 *
 * CMC paginates via `start` (1-indexed) and `limit` (max
 * {@link LISTINGS_MAX_LIMIT}).
 *
 * @param baseUrl - Base API URL.
 * @param options - Pagination, sort, and quote-currency options.
 * @returns Fully-constructed request URL.
 */
const buildListingsLatestUrl = (baseUrl: string, options: ListCoinsOptions): string => {
  const vsCurrency = options.vsCurrency ?? DEFAULT_VS_CURRENCY
  const limit = options.limit ?? DEFAULT_LIST_LIMIT
  const page = options.page ?? DEFAULT_LIST_PAGE
  const start = (page - 1) * limit + 1
  const params = new URLSearchParams({
    start: String(start),
    limit: String(limit),
    convert: toCmcConvert(vsCurrency),
    sort: 'market_cap',
    sort_dir: options.order === 'market-cap-asc' ? 'asc' : 'desc',
  })
  return `${baseUrl}/cryptocurrency/listings/latest?${params.toString()}`
}

/**
 * Builds the `/cryptocurrency/listings/latest` URL for paginated symbol
 * discovery (used by {@link CryptoPricesProvider.listSupportedSymbols}).
 *
 * @param baseUrl - Base API URL.
 * @param start - 1-indexed start position.
 * @param limit - Number of rows to request (≤ {@link LISTINGS_MAX_LIMIT}).
 * @returns Fully-constructed request URL.
 */
const buildListingsForSymbolsUrl = (baseUrl: string, start: number, limit: number): string => {
  const params = new URLSearchParams({
    start: String(start),
    limit: String(limit),
    convert: 'USD',
    sort: 'market_cap',
    sort_dir: 'desc',
  })
  return `${baseUrl}/cryptocurrency/listings/latest?${params.toString()}`
}

/**
 * Builds the `/cryptocurrency/quotes/historical` URL.
 *
 * `time_start` is computed as `now - days*86400s`, `time_end` as `now`.
 *
 * @param baseUrl - Base API URL.
 * @param id - Coin id (passed through as `symbol`).
 * @param days - History window, in days.
 * @param vsCurrency - Quote currency.
 * @returns Fully-constructed request URL.
 */
const buildQuotesHistoricalUrl = (
  baseUrl: string,
  id: CoinId,
  days: HistoricalDays,
  vsCurrency: VsCurrency,
): string => {
  const now = Date.now()
  const start = new Date(now - days * 24 * 60 * 60 * 1000).toISOString()
  const end = new Date(now).toISOString()
  const params = new URLSearchParams({
    symbol: id,
    time_start: start,
    time_end: end,
    convert: toCmcConvert(vsCurrency),
  })
  return `${baseUrl}/cryptocurrency/quotes/historical?${params.toString()}`
}

/**
 * Creates a CoinMarketCap crypto-prices provider.
 *
 * @param config - Provider configuration. {@link CoinMarketCapCryptoPricesConfig.apiKey}
 *   (or `COINMARKETCAP_API_KEY` in `process.env`) must be set for the
 *   upstream API to accept any request.
 * @returns A {@link CryptoPricesProvider} backed by the CoinMarketCap Pro
 *   v1 API.
 */
export const createProvider = (
  config: CoinMarketCapCryptoPricesConfig = {},
): CryptoPricesProvider => {
  const baseUrl = resolveBaseUrl(config)

  return {
    async listCoins(options: ListCoinsOptions = {}): Promise<CoinMarketRow[]> {
      const vsCurrency = options.vsCurrency ?? DEFAULT_VS_CURRENCY
      const url = buildListingsLatestUrl(baseUrl, options)
      const data = await fetchJson<CmcListingsLatestResponse>(url, config)
      return data.data.map((row) => mapMarketRow(row, vsCurrency))
    },

    async getPrice(
      id: CoinId,
      vsCurrency: VsCurrency = DEFAULT_VS_CURRENCY,
    ): Promise<CoinPriceQuote> {
      const url = buildQuotesLatestUrl(baseUrl, id, vsCurrency)
      const data = await fetchJson<CmcQuotesLatestResponse>(url, config)
      const row = firstRow(data.data[id] ?? data.data[id.toUpperCase()])
      if (!row) {
        throw new Error(`CoinMarketCap returned no price data for coin '${id}'`)
      }
      const quote = pickQuote(row.quote, vsCurrency)
      if (!quote || typeof quote.price !== 'number') {
        throw new Error(`CoinMarketCap returned no '${vsCurrency}' price for coin '${id}'`)
      }
      const change24h =
        typeof quote.percent_change_24h === 'number' ? quote.percent_change_24h : null
      const lastUpdated = quote.last_updated ?? row.last_updated
      return {
        id,
        vsCurrency,
        price: quote.price,
        change24h,
        asOf: typeof lastUpdated === 'string' ? new Date(lastUpdated) : new Date(),
      }
    },

    async getHistorical(
      id: CoinId,
      days: HistoricalDays,
      vsCurrency: VsCurrency = DEFAULT_VS_CURRENCY,
    ): Promise<CoinPricePoint[]> {
      const url = buildQuotesHistoricalUrl(baseUrl, id, days, vsCurrency)
      const data = await fetchJson<CmcQuotesHistoricalResponse>(url, config)
      const row = firstHistoricalRow(data.data[id] ?? data.data[id.toUpperCase()])
      if (!row) {
        return []
      }
      return row.quotes
        .map((sample): CoinPricePoint | null => {
          const quote = pickQuote(sample.quote, vsCurrency)
          if (!quote || typeof quote.price !== 'number') {
            return null
          }
          return {
            ts: new Date(sample.timestamp),
            price: quote.price,
          }
        })
        .filter((point): point is CoinPricePoint => point !== null)
    },

    async listSupportedSymbols(): Promise<CoinId[]> {
      const ids: string[] = []
      let start = 1
      // CMC `listings/latest` caps at LISTINGS_MAX_LIMIT per call; keep
      // paging until a short page is returned.
      // (The free Basic tier caps total accessible coins below this; the
      // bond returns whatever the configured key has access to.)
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const url = buildListingsForSymbolsUrl(baseUrl, start, LISTINGS_MAX_LIMIT)
        const data = await fetchJson<CmcListingsLatestResponse>(url, config)
        for (const row of data.data) {
          ids.push(String(row.id))
        }
        if (data.data.length < LISTINGS_MAX_LIMIT) {
          break
        }
        start += LISTINGS_MAX_LIMIT
      }
      return ids
    },

    async getMarketStats(
      id: CoinId,
      vsCurrency: VsCurrency = DEFAULT_VS_CURRENCY,
    ): Promise<CoinMarketStats> {
      const url = buildQuotesLatestUrl(baseUrl, id, vsCurrency)
      const data = await fetchJson<CmcQuotesLatestResponse>(url, config)
      const row = firstRow(data.data[id] ?? data.data[id.toUpperCase()])
      if (!row) {
        throw new Error(`CoinMarketCap returned no market data for coin '${id}'`)
      }
      const quote = pickQuote(row.quote, vsCurrency)
      if (!quote || typeof quote.price !== 'number') {
        throw new Error(
          `CoinMarketCap returned no '${vsCurrency}' price in market_data for coin '${id}'`,
        )
      }
      const lastUpdated = quote.last_updated ?? row.last_updated
      return {
        id,
        vsCurrency,
        price: quote.price,
        marketCap: typeof quote.market_cap === 'number' ? quote.market_cap : null,
        volume24h: typeof quote.volume_24h === 'number' ? quote.volume_24h : null,
        circulatingSupply:
          typeof row.circulating_supply === 'number' ? row.circulating_supply : null,
        totalSupply: typeof row.total_supply === 'number' ? row.total_supply : null,
        change24h: typeof quote.percent_change_24h === 'number' ? quote.percent_change_24h : null,
        asOf: typeof lastUpdated === 'string' ? new Date(lastUpdated) : new Date(),
      }
    },
  }
}

/** Lazily-initialized default provider instance. */
let _provider: CryptoPricesProvider | null = null

/**
 * The provider implementation, lazily initialized on first use.
 *
 * Reads `COINMARKETCAP_API_KEY` and `COINMARKETCAP_BASE_URL` from
 * environment variables. The CMC Pro API requires authentication, so an
 * API key must be configured before any request is made; otherwise the
 * upstream server returns 401.
 */
export const provider: CryptoPricesProvider = new Proxy({} as CryptoPricesProvider, {
  get(_, prop, receiver) {
    if (!_provider) {
      _provider = createProvider({
        ...(process.env['COINMARKETCAP_BASE_URL']
          ? { baseUrl: process.env['COINMARKETCAP_BASE_URL'] }
          : {}),
        ...(process.env['COINMARKETCAP_API_KEY']
          ? { apiKey: process.env['COINMARKETCAP_API_KEY'] }
          : {}),
      })
    }
    return Reflect.get(_provider, prop, receiver)
  },
})
