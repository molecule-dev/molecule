/**
 * IEX Cloud implementation of EquityPricesProvider.
 *
 * Wraps the public `https://cloud.iexapis.com/stable/` endpoint family,
 * which exposes equity quotes (`/stock/:symbol/quote`), historical price
 * series (`/stock/:symbol/chart/:range`), symbol search
 * (`/search/:query`), and fundamentals via two complementary endpoints
 * (`/stock/:symbol/company` + `/stock/:symbol/stats`).
 *
 * IEX Cloud signals quota exhaustion / paid-tier-required with HTTP `402
 * Payment Required`. This provider detects that response and surfaces it as
 * an `Error` with `cause: { code: 'RATE_LIMITED' }` so callers can
 * distinguish it from generic upstream failures and back off accordingly.
 *
 * The configured API key is NEVER included in error messages. Failure URLs
 * are sanitized to redact the `token` query parameter.
 *
 * @module
 */

import type {
  EquityFundamentals,
  EquityHistoricalBar,
  EquityHistoricalRange,
  EquityPricesProvider,
  EquityQuote,
  EquitySymbol,
  EquitySymbolMatch,
  ExchangeCode,
} from '@molecule/api-equity-prices'

import type { IexEquityPricesConfig } from './types.js'
import { MISSING_API_KEY, RATE_LIMITED, UPSTREAM_ERROR } from './types.js'

/** Default IEX Cloud public endpoint base URL. */
const DEFAULT_BASE_URL = 'https://cloud.iexapis.com/stable'

/** Default request timeout in milliseconds. */
const DEFAULT_TIMEOUT = 10_000

/**
 * Static catalogue of equity exchanges IEX Cloud covers via the
 * `/stock/...` endpoints. IEX Cloud's primary coverage is US listed
 * securities; international coverage exists via separate endpoints not
 * exposed through this provider.
 */
const SUPPORTED_EXCHANGES: readonly ExchangeCode[] = [
  'NYSE',
  'NASDAQ',
  'AMEX',
  'BATS',
  'NYSE ARCA',
  'IEX',
  'OTC',
]

/**
 * Maps each core {@link EquityHistoricalRange} to the IEX Cloud `range`
 * path segment. IEX accepts: `1d`, `5d`, `1m`, `3m`, `6m`, `1y`, `2y`,
 * `5y`, `max`. We pass the closest supported range for each core value.
 */
const rangeToIex: Record<EquityHistoricalRange, string> = {
  '1d': '1d',
  '5d': '5d',
  '1m': '1m',
  '3m': '3m',
  '6m': '6m',
  '1y': '1y',
  '5y': '5y',
  max: 'max',
}

/**
 * Shape of an IEX Cloud `/stock/:symbol/quote` response payload. Many
 * fields are optional because IEX coverage varies by asset class.
 */
interface IexQuoteResponse {
  /** Ticker symbol echoed by the API (e.g. `'AAPL'`). */
  symbol?: string
  /** Latest traded price; missing for some asset classes (use latestPrice). */
  latestPrice?: number
  /** Previous close — fallback when latestPrice is missing. */
  close?: number
  /** Iso currency code (IEX returns a 3-letter ISO 4217 code). */
  currency?: string
  /** Latest update timestamp in milliseconds since epoch. */
  latestUpdate?: number
  /** Primary exchange the symbol trades on, if known. */
  primaryExchange?: string
}

/**
 * Single bar in the IEX Cloud `/stock/:symbol/chart/:range` response.
 *
 * For `1d` IEX returns intraday bars with a `minute` field; for daily ranges
 * the date alone identifies the bar.
 */
interface IexChartBar {
  /** Bar date in `YYYY-MM-DD` form. */
  date?: string
  /** Bar minute in `HH:MM` form (only present for intraday). */
  minute?: string
  /** Closing price for the bar. */
  close?: number
}

/**
 * Single match row in the IEX Cloud `/search/:query` response.
 */
interface IexSearchMatch {
  /** Ticker symbol. */
  symbol?: string
  /** Human-readable security name. */
  securityName?: string
  /** Exchange the symbol is listed on, if known. */
  exchange?: string
  /** Currency the security trades in, if known. */
  currency?: string
}

/**
 * Shape of an IEX Cloud `/stock/:symbol/company` response payload.
 */
interface IexCompanyResponse {
  /** Ticker symbol echoed by the API. */
  symbol?: string
}

/**
 * Shape of an IEX Cloud `/stock/:symbol/stats` response payload (the
 * combined "key stats" endpoint that contains fundamentals).
 */
interface IexStatsResponse {
  /** Market capitalization in major units. */
  marketcap?: number
  /** Trailing P/E ratio. */
  peRatio?: number
  /** Trailing twelve-month earnings per share. */
  ttmEPS?: number
  /** Trailing dividend yield as a percentage (IEX returns e.g. `1.23` for 1.23%). */
  dividendYield?: number
}

/**
 * Returns a copy of {@link url} with the `token` query parameter redacted,
 * so it can safely appear in error messages and logs.
 *
 * @param url - URL string that may contain a `token=...` query parameter.
 * @returns The same URL with `token=REDACTED`.
 */
export const sanitizeUrl = (url: string): string => {
  return url.replace(/([?&])token=[^&]*/iu, '$1token=REDACTED')
}

/**
 * Resolves the configured API key, throwing a sanitized error if none is
 * available. Reads `IEX_API_KEY` from the environment as a fallback.
 *
 * @param config - Provider configuration.
 * @returns The resolved API key.
 * @throws {Error} If no API key is configured.
 */
const requireApiKey = (config: IexEquityPricesConfig): string => {
  const key = config.apiKey ?? process.env['IEX_API_KEY']
  if (typeof key !== 'string' || key.length === 0) {
    throw new Error(
      'IEX Cloud API key not configured. Set IEX_API_KEY or pass apiKey to createProvider().',
      { cause: { code: MISSING_API_KEY } },
    )
  }
  return key
}

/**
 * Issues a GET request against an IEX Cloud endpoint and parses the JSON
 * response, with rate-limit and error-message detection.
 *
 * @param url - Fully-qualified URL including the `token` query parameter.
 * @param timeout - Request timeout in milliseconds.
 * @returns Parsed IEX Cloud response payload, narrowed by `T`.
 * @throws {Error} If the upstream returns a non-OK HTTP status. HTTP `402`
 *   is mapped to `cause.code === 'RATE_LIMITED'`; other non-OK statuses are
 *   mapped to `cause.code === 'UPSTREAM_ERROR'`. Error messages NEVER
 *   include the API key.
 */
const fetchJson = async <T>(url: string, timeout: number): Promise<T> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (response.status === 402) {
      throw new Error(
        `IEX Cloud quota exhausted or payment required for ${sanitizeUrl(url)} (status 402)`,
        { cause: { code: RATE_LIMITED } },
      )
    }
    if (!response.ok) {
      throw new Error(
        `IEX Cloud request to ${sanitizeUrl(url)} failed with status ${String(response.status)}`,
        { cause: { code: UPSTREAM_ERROR } },
      )
    }
    return (await response.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Builds a fully-qualified IEX Cloud endpoint URL with the API token
 * appended as a query parameter.
 *
 * @param baseUrl - Resolved base URL (e.g. `'https://cloud.iexapis.com/stable'`).
 * @param path - Endpoint path (e.g. `/stock/AAPL/quote`).
 * @param apiKey - Resolved API key.
 * @param extraParams - Optional additional query parameters.
 * @returns Fully-qualified URL.
 */
const buildUrl = (
  baseUrl: string,
  path: string,
  apiKey: string,
  extraParams?: Record<string, string>,
): string => {
  const params = new URLSearchParams()
  params.set('token', apiKey)
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      params.set(key, value)
    }
  }
  return `${baseUrl}${path}?${params.toString()}`
}

/**
 * Maps an IEX Cloud `/stock/:symbol/quote` response to a normalized
 * {@link EquityQuote}.
 *
 * @param symbol - Symbol the caller asked about (used as a fallback if the
 *   response omits its echo).
 * @param body - Parsed IEX Cloud quote response.
 * @returns Normalized {@link EquityQuote}.
 * @throws {Error} If the response is missing both `latestPrice` and `close`.
 */
const mapQuote = (symbol: EquitySymbol, body: IexQuoteResponse): EquityQuote => {
  const price = typeof body.latestPrice === 'number' ? body.latestPrice : body.close
  if (typeof price !== 'number' || !Number.isFinite(price)) {
    throw new Error(`IEX Cloud returned no price for symbol ${body.symbol ?? symbol}`, {
      cause: { code: UPSTREAM_ERROR },
    })
  }
  const ts =
    typeof body.latestUpdate === 'number' && Number.isFinite(body.latestUpdate)
      ? new Date(body.latestUpdate)
      : new Date()
  const result: EquityQuote = {
    symbol: body.symbol ?? symbol,
    price,
    currency: body.currency ?? 'USD',
    ts,
  }
  if (body.primaryExchange) {
    result.exchange = body.primaryExchange
  }
  return result
}

/**
 * Maps an IEX Cloud `/stock/:symbol/chart/:range` response to ascending
 * order {@link EquityHistoricalBar} entries. IEX returns chart series in
 * ascending order already; this function normalizes timestamps and skips
 * bars that are missing a usable close price.
 *
 * @param bars - Raw IEX chart series.
 * @returns Ascending-order array of historical bars.
 */
const mapChart = (bars: IexChartBar[]): EquityHistoricalBar[] => {
  const result: EquityHistoricalBar[] = []
  for (const bar of bars) {
    if (typeof bar.close !== 'number' || !Number.isFinite(bar.close)) {
      continue
    }
    if (!bar.date) {
      continue
    }
    const tsString = bar.minute ? `${bar.date}T${bar.minute}:00Z` : `${bar.date}T00:00:00Z`
    const ts = new Date(tsString)
    if (Number.isNaN(ts.getTime())) {
      continue
    }
    result.push({ ts, close: bar.close })
  }
  return result
}

/**
 * Combines the IEX Cloud `/company` and `/stats` payloads into a normalized
 * {@link EquityFundamentals} snapshot.
 *
 * IEX Cloud reports `dividendYield` as a percentage (e.g. `1.23` for
 * 1.23%) on the `stats` endpoint; the core contract is a fraction (e.g.
 * `0.0123`), so this function divides by 100 when mapping.
 *
 * @param symbol - Symbol the caller asked about (used as fallback).
 * @param company - Parsed `/company` response.
 * @param stats - Parsed `/stats` response.
 * @returns Normalized fundamentals snapshot.
 */
const mapFundamentals = (
  symbol: EquitySymbol,
  company: IexCompanyResponse,
  stats: IexStatsResponse,
): EquityFundamentals => {
  const result: EquityFundamentals = {
    symbol: company.symbol ?? symbol,
  }
  if (typeof stats.marketcap === 'number' && Number.isFinite(stats.marketcap)) {
    result.marketCap = stats.marketcap
  }
  if (typeof stats.peRatio === 'number' && Number.isFinite(stats.peRatio)) {
    result.peRatio = stats.peRatio
  }
  if (typeof stats.ttmEPS === 'number' && Number.isFinite(stats.ttmEPS)) {
    result.eps = stats.ttmEPS
  }
  if (typeof stats.dividendYield === 'number' && Number.isFinite(stats.dividendYield)) {
    result.dividendYield = stats.dividendYield / 100
  }
  return result
}

/**
 * Maps IEX Cloud `/search/:query` rows to normalized
 * {@link EquitySymbolMatch} entries. Rows missing both a symbol and a name
 * are skipped.
 *
 * @param rows - Parsed IEX Cloud search response (an array).
 * @returns Array of symbol matches, possibly empty.
 */
const mapMatches = (rows: IexSearchMatch[]): EquitySymbolMatch[] => {
  const result: EquitySymbolMatch[] = []
  for (const row of rows) {
    if (!row.symbol || !row.securityName) {
      continue
    }
    const match: EquitySymbolMatch = {
      symbol: row.symbol,
      name: row.securityName,
    }
    if (row.exchange) {
      match.exchange = row.exchange
    }
    if (row.currency) {
      match.currency = row.currency
    }
    result.push(match)
  }
  return result
}

/**
 * Creates an IEX Cloud equity-prices provider.
 *
 * @param config - Provider configuration. The API key may be supplied here
 *   directly or via the `IEX_API_KEY` environment variable.
 * @returns An {@link EquityPricesProvider} backed by IEX Cloud.
 */
export const createProvider = (config: IexEquityPricesConfig = {}): EquityPricesProvider => {
  const baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/u, '')
  const timeout = config.timeout ?? DEFAULT_TIMEOUT

  return {
    async getQuote(symbol: EquitySymbol): Promise<EquityQuote> {
      const apiKey = requireApiKey(config)
      const url = buildUrl(baseUrl, `/stock/${encodeURIComponent(symbol)}/quote`, apiKey)
      const body = await fetchJson<IexQuoteResponse>(url, timeout)
      return mapQuote(symbol, body)
    },

    async getHistorical(
      symbol: EquitySymbol,
      range: EquityHistoricalRange,
    ): Promise<EquityHistoricalBar[]> {
      const apiKey = requireApiKey(config)
      const iexRange = rangeToIex[range]
      const url = buildUrl(
        baseUrl,
        `/stock/${encodeURIComponent(symbol)}/chart/${iexRange}`,
        apiKey,
      )
      const body = await fetchJson<IexChartBar[]>(url, timeout)
      if (!Array.isArray(body)) {
        return []
      }
      return mapChart(body)
    },

    async searchSymbol(query: string): Promise<EquitySymbolMatch[]> {
      const apiKey = requireApiKey(config)
      const url = buildUrl(baseUrl, `/search/${encodeURIComponent(query)}`, apiKey)
      const body = await fetchJson<IexSearchMatch[]>(url, timeout)
      if (!Array.isArray(body)) {
        return []
      }
      return mapMatches(body)
    },

    async getFundamentals(symbol: EquitySymbol): Promise<EquityFundamentals> {
      const apiKey = requireApiKey(config)
      const companyUrl = buildUrl(baseUrl, `/stock/${encodeURIComponent(symbol)}/company`, apiKey)
      const statsUrl = buildUrl(baseUrl, `/stock/${encodeURIComponent(symbol)}/stats`, apiKey)
      const [company, stats] = await Promise.all([
        fetchJson<IexCompanyResponse>(companyUrl, timeout),
        fetchJson<IexStatsResponse>(statsUrl, timeout),
      ])
      return mapFundamentals(symbol, company, stats)
    },

    async listSupportedExchanges(): Promise<ExchangeCode[]> {
      return [...SUPPORTED_EXCHANGES]
    },
  }
}

/** Lazily-initialized default provider. */
let _provider: EquityPricesProvider | null = null

/**
 * The default provider implementation, lazily initialized on first use.
 *
 * Reads `IEX_API_KEY` and (optional) `IEX_BASE_URL` from environment
 * variables. Use {@link createProvider} directly if you need to supply
 * configuration programmatically.
 */
export const provider: EquityPricesProvider = new Proxy({} as EquityPricesProvider, {
  get(_, prop, receiver) {
    if (!_provider) {
      _provider = createProvider({
        ...(process.env['IEX_BASE_URL'] ? { baseUrl: process.env['IEX_BASE_URL'] } : {}),
        ...(process.env['IEX_API_KEY'] ? { apiKey: process.env['IEX_API_KEY'] } : {}),
      })
    }
    return Reflect.get(_provider, prop, receiver)
  },
})
