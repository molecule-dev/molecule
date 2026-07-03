/**
 * CoinGecko implementation of {@link CryptoPricesProvider}.
 *
 * Wraps the public CoinGecko v3 API (`https://api.coingecko.com/api/v3`).
 * The public endpoint is keyless and rate-limited; setting
 * `COINGECKO_API_KEY` (or {@link CoinGeckoCryptoPricesConfig.apiKey}) routes
 * traffic to the Pro endpoint (`https://pro-api.coingecko.com/api/v3`) and
 * authenticates via the `x-cg-pro-api-key` header.
 *
 * The provider performs a structural reshape from CoinGecko's wire format
 * to the normalized core types — no unit conversion is needed.
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

import type { CoinGeckoCryptoPricesConfig } from './types.js'
import { CoinGeckoRateLimitedError } from './types.js'

/** Default public CoinGecko v3 API base URL (keyless tier). */
const DEFAULT_PUBLIC_BASE_URL = 'https://api.coingecko.com/api/v3'

/** Default Pro CoinGecko v3 API base URL (used when an API key is configured). */
const DEFAULT_PRO_BASE_URL = 'https://pro-api.coingecko.com/api/v3'

/** Default request timeout, in milliseconds. */
const DEFAULT_TIMEOUT = 10_000

/** Default vs-currency used when the caller omits the argument. */
const DEFAULT_VS_CURRENCY = 'usd'

/** Default page size used by {@link CryptoPricesProvider.listCoins}. */
const DEFAULT_LIST_LIMIT = 100

/** Default page used by {@link CryptoPricesProvider.listCoins}. */
const DEFAULT_LIST_PAGE = 1

/**
 * CoinGecko `/simple/price` response shape: `{ id: { vsCurrency: number,
 * vsCurrency_24h_change?: number, last_updated_at?: number } }`.
 */
type SimplePriceResponse = Record<string, Record<string, number>>

/**
 * Single row from CoinGecko's `/coins/markets` endpoint. Only the fields the
 * provider maps are typed; CoinGecko returns many more.
 */
interface CoinsMarketsRow {
  /** CoinGecko coin id (e.g. `'bitcoin'`). */
  id: string
  /** Ticker symbol (e.g. `'btc'`). */
  symbol: string
  /** Display name (e.g. `'Bitcoin'`). */
  name: string
  /** Latest spot price in the requested vs-currency. */
  current_price: number
  /** Market-cap rank, 1 = largest. May be `null`. */
  market_cap_rank: number | null
  /** 24-hour percent change in price. May be `null`. */
  price_change_percentage_24h: number | null
  /** ISO 8601 string of when CoinGecko last updated the row. */
  last_updated: string
}

/**
 * `/coins/{id}/market_chart` response shape. Each tuple is `[ms, value]`.
 */
interface MarketChartResponse {
  prices: Array<[number, number]>
}

/**
 * `/coins/{id}` (with `localization=false&tickers=false`) response shape.
 * Only the fields the provider maps are typed.
 */
interface CoinDetailResponse {
  id: string
  market_data?: {
    current_price?: Record<string, number>
    market_cap?: Record<string, number>
    total_volume?: Record<string, number>
    price_change_percentage_24h?: number | null
    circulating_supply?: number | null
    total_supply?: number | null
    last_updated?: string
  }
  last_updated?: string
}

/**
 * Single row from `/coins/list`. Only the fields the provider maps are
 * typed.
 */
interface CoinsListRow {
  id: string
  symbol: string
  name: string
}

/**
 * Internal HTTP error raised by {@link fetchJson} for non-OK statuses other
 * than 429 (rate-limit, which raises {@link CoinGeckoRateLimitedError}).
 */
class CoinGeckoHttpError extends Error {
  public readonly status: number

  public constructor(status: number) {
    super(`CoinGecko API request failed with status ${String(status)}`)
    this.name = 'CoinGeckoHttpError'
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
 * config and whether an API key was provided.
 *
 * @param config - Provider configuration.
 * @returns The base URL to call.
 */
const resolveBaseUrl = (config: CoinGeckoCryptoPricesConfig): string => {
  if (config.baseUrl) {
    return config.baseUrl
  }
  return config.apiKey ? DEFAULT_PRO_BASE_URL : DEFAULT_PUBLIC_BASE_URL
}

/**
 * Performs a GET request against CoinGecko and parses the JSON response.
 *
 * Adds the `x-cg-pro-api-key` header when {@link config.apiKey} is set.
 * Maps HTTP 429 responses onto {@link CoinGeckoRateLimitedError}; all other
 * non-OK statuses raise {@link CoinGeckoHttpError}. The provided API key is
 * never included in error messages.
 *
 * @template T - Expected JSON response shape.
 * @param url - Fully-constructed request URL including query params.
 * @param config - Provider configuration (used for auth header + timeout).
 * @returns Parsed JSON body cast to `T`.
 * @throws {CoinGeckoRateLimitedError} On HTTP 429.
 * @throws {CoinGeckoHttpError} On any other non-OK status.
 */
const fetchJson = async <T>(url: string, config: CoinGeckoCryptoPricesConfig): Promise<T> => {
  const timeout = config.timeout ?? DEFAULT_TIMEOUT
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (config.apiKey) {
    headers['x-cg-pro-api-key'] = config.apiKey
  }
  try {
    const response = await fetch(url, { signal: controller.signal, headers })
    if (response.status === 429) {
      const retryAfter = parseRetryAfter(response.headers.get('retry-after'))
      throw new CoinGeckoRateLimitedError(
        'CoinGecko API rate limit exceeded (HTTP 429)',
        retryAfter,
      )
    }
    if (!response.ok) {
      throw new CoinGeckoHttpError(response.status)
    }
    return (await response.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Maps a CoinGecko `/coins/markets` row to a normalized {@link CoinMarketRow}.
 *
 * @param row - Raw market row from CoinGecko.
 * @param vsCurrency - Quote currency the row was requested in.
 * @returns Normalized market row.
 */
const mapMarketRow = (row: CoinsMarketsRow, vsCurrency: VsCurrency): CoinMarketRow => ({
  id: row.id,
  symbol: row.symbol,
  name: row.name,
  vsCurrency,
  price: row.current_price,
  rank: row.market_cap_rank,
  change24h: row.price_change_percentage_24h,
  asOf: new Date(row.last_updated),
})

/**
 * Builds the `/simple/price` URL.
 *
 * @param baseUrl - Base API URL.
 * @param id - Coin id.
 * @param vsCurrency - Quote currency.
 * @returns Fully-constructed request URL.
 */
const buildSimplePriceUrl = (baseUrl: string, id: CoinId, vsCurrency: VsCurrency): string => {
  const params = new URLSearchParams({
    ids: id,
    vs_currencies: vsCurrency,
    include_24hr_change: 'true',
    include_last_updated_at: 'true',
  })
  return `${baseUrl}/simple/price?${params.toString()}`
}

/**
 * Builds the `/coins/markets` URL.
 *
 * @param baseUrl - Base API URL.
 * @param options - Pagination, sort, and quote-currency options.
 * @returns Fully-constructed request URL.
 */
const buildCoinsMarketsUrl = (baseUrl: string, options: ListCoinsOptions): string => {
  const vsCurrency = options.vsCurrency ?? DEFAULT_VS_CURRENCY
  const params = new URLSearchParams({
    vs_currency: vsCurrency,
    order: options.order === 'market-cap-asc' ? 'market_cap_asc' : 'market_cap_desc',
    per_page: String(options.limit ?? DEFAULT_LIST_LIMIT),
    page: String(options.page ?? DEFAULT_LIST_PAGE),
    sparkline: 'false',
    price_change_percentage: '24h',
  })
  return `${baseUrl}/coins/markets?${params.toString()}`
}

/**
 * Builds the `/coins/{id}/market_chart` URL.
 *
 * @param baseUrl - Base API URL.
 * @param id - Coin id.
 * @param days - History window, in days.
 * @param vsCurrency - Quote currency.
 * @returns Fully-constructed request URL.
 */
const buildMarketChartUrl = (
  baseUrl: string,
  id: CoinId,
  days: HistoricalDays,
  vsCurrency: VsCurrency,
): string => {
  const params = new URLSearchParams({
    vs_currency: vsCurrency,
    days: String(days),
  })
  return `${baseUrl}/coins/${encodeURIComponent(id)}/market_chart?${params.toString()}`
}

/**
 * Builds the `/coins/{id}` URL with localization + tickers disabled.
 *
 * @param baseUrl - Base API URL.
 * @param id - Coin id.
 * @returns Fully-constructed request URL.
 */
const buildCoinDetailUrl = (baseUrl: string, id: CoinId): string => {
  const params = new URLSearchParams({
    localization: 'false',
    tickers: 'false',
    market_data: 'true',
    community_data: 'false',
    developer_data: 'false',
    sparkline: 'false',
  })
  return `${baseUrl}/coins/${encodeURIComponent(id)}?${params.toString()}`
}

/**
 * Builds the `/coins/list` URL.
 *
 * @param baseUrl - Base API URL.
 * @returns Fully-constructed request URL.
 */
const buildCoinsListUrl = (baseUrl: string): string => `${baseUrl}/coins/list`

/**
 * Creates a CoinGecko crypto-prices provider.
 *
 * @param config - Provider configuration. All fields are optional.
 * @returns A {@link CryptoPricesProvider} backed by the CoinGecko v3 API.
 */
export const createProvider = (config: CoinGeckoCryptoPricesConfig = {}): CryptoPricesProvider => {
  const baseUrl = resolveBaseUrl(config)

  return {
    async listCoins(options: ListCoinsOptions = {}): Promise<CoinMarketRow[]> {
      const vsCurrency = options.vsCurrency ?? DEFAULT_VS_CURRENCY
      const url = buildCoinsMarketsUrl(baseUrl, options)
      const rows = await fetchJson<CoinsMarketsRow[]>(url, config)
      return rows.map((row) => mapMarketRow(row, vsCurrency))
    },

    async getPrice(
      id: CoinId,
      vsCurrency: VsCurrency = DEFAULT_VS_CURRENCY,
    ): Promise<CoinPriceQuote> {
      const url = buildSimplePriceUrl(baseUrl, id, vsCurrency)
      const data = await fetchJson<SimplePriceResponse>(url, config)
      const entry = data[id]
      if (!entry) {
        throw new Error(`CoinGecko returned no price data for coin '${id}'`)
      }
      const price = entry[vsCurrency]
      if (typeof price !== 'number') {
        throw new Error(`CoinGecko returned no '${vsCurrency}' price for coin '${id}'`)
      }
      const changeKey = `${vsCurrency}_24h_change`
      const updatedKey = 'last_updated_at'
      const rawChange = entry[changeKey]
      const change24h = typeof rawChange === 'number' ? rawChange : null
      const rawUpdated = entry[updatedKey]
      const asOf =
        typeof rawUpdated === 'number' && Number.isFinite(rawUpdated)
          ? new Date(rawUpdated * 1000)
          : new Date()
      return {
        id,
        vsCurrency,
        price,
        change24h,
        asOf,
      }
    },

    async getHistorical(
      id: CoinId,
      days: HistoricalDays,
      vsCurrency: VsCurrency = DEFAULT_VS_CURRENCY,
    ): Promise<CoinPricePoint[]> {
      const url = buildMarketChartUrl(baseUrl, id, days, vsCurrency)
      const data = await fetchJson<MarketChartResponse>(url, config)
      return data.prices.map(([ms, price]) => ({ ts: new Date(ms), price }))
    },

    async listSupportedSymbols(): Promise<CoinId[]> {
      const url = buildCoinsListUrl(baseUrl)
      const rows = await fetchJson<CoinsListRow[]>(url, config)
      return rows.map((row) => row.id)
    },

    async getMarketStats(
      id: CoinId,
      vsCurrency: VsCurrency = DEFAULT_VS_CURRENCY,
    ): Promise<CoinMarketStats> {
      const url = buildCoinDetailUrl(baseUrl, id)
      const data = await fetchJson<CoinDetailResponse>(url, config)
      const md = data.market_data ?? {}
      const price = md.current_price?.[vsCurrency]
      if (typeof price !== 'number') {
        throw new Error(
          `CoinGecko returned no '${vsCurrency}' price in market_data for coin '${id}'`,
        )
      }
      const marketCap = md.market_cap?.[vsCurrency]
      const volume24h = md.total_volume?.[vsCurrency]
      const updated = md.last_updated ?? data.last_updated
      return {
        id,
        vsCurrency,
        price,
        marketCap: typeof marketCap === 'number' ? marketCap : null,
        volume24h: typeof volume24h === 'number' ? volume24h : null,
        circulatingSupply: typeof md.circulating_supply === 'number' ? md.circulating_supply : null,
        totalSupply: typeof md.total_supply === 'number' ? md.total_supply : null,
        change24h:
          typeof md.price_change_percentage_24h === 'number'
            ? md.price_change_percentage_24h
            : null,
        asOf: typeof updated === 'string' ? new Date(updated) : new Date(),
      }
    },
  }
}

/** Lazily-initialized default provider instance. */
let _provider: CryptoPricesProvider | null = null

/**
 * The provider implementation, lazily initialized on first use.
 *
 * Reads `COINGECKO_API_KEY` and `COINGECKO_BASE_URL` from environment
 * variables. When `COINGECKO_API_KEY` is set the provider routes traffic
 * to the Pro endpoint and authenticates with the `x-cg-pro-api-key` header;
 * the public free tier requires no key.
 */
export const provider: CryptoPricesProvider = new Proxy({} as CryptoPricesProvider, {
  get(_, prop, receiver) {
    if (!_provider) {
      _provider = createProvider({
        ...(process.env['COINGECKO_BASE_URL']
          ? { baseUrl: process.env['COINGECKO_BASE_URL'] }
          : {}),
        ...(process.env['COINGECKO_API_KEY'] ? { apiKey: process.env['COINGECKO_API_KEY'] } : {}),
      })
    }
    return Reflect.get(_provider, prop, receiver)
  },
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) {
      _provider = createProvider({
        ...(process.env['COINGECKO_BASE_URL']
          ? { baseUrl: process.env['COINGECKO_BASE_URL'] }
          : {}),
        ...(process.env['COINGECKO_API_KEY'] ? { apiKey: process.env['COINGECKO_API_KEY'] } : {}),
      })
    }
    return Reflect.set(_provider, prop, value)
  },
})
