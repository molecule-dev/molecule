/**
 * Alpha Vantage implementation of EquityPricesProvider.
 *
 * Wraps the public `https://www.alphavantage.co/query` endpoint, which
 * exposes equity quotes (`GLOBAL_QUOTE`), historical price series
 * (`TIME_SERIES_DAILY` / `TIME_SERIES_INTRADAY`), symbol search
 * (`SYMBOL_SEARCH`), and fundamentals (`OVERVIEW`).
 *
 * The free tier is rate-limited to ~5 requests per minute. When that limit
 * is hit, Alpha Vantage returns HTTP 200 with a JSON body containing a
 * `Note` field — this provider detects that response shape and surfaces it
 * as an `Error` with `cause: { code: 'RATE_LIMITED' }` so callers can
 * distinguish it from generic upstream failures.
 *
 * The configured API key is NEVER included in error messages. Failure URLs
 * are sanitized to redact the `apikey` query parameter.
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'

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

import type { AlphaVantageEquityPricesConfig } from './types.js'
import { MISSING_API_KEY, RATE_LIMITED, UPSTREAM_ERROR } from './types.js'

/** Default Alpha Vantage public endpoint base URL. */
const DEFAULT_BASE_URL = 'https://www.alphavantage.co'

/** Default request timeout in milliseconds. */
const DEFAULT_TIMEOUT = 10_000

/** Static catalogue of US equity exchanges Alpha Vantage covers. */
const SUPPORTED_EXCHANGES: readonly ExchangeCode[] = [
  'NYSE',
  'NASDAQ',
  'AMEX',
  'BATS',
  'NYSE ARCA',
  'NYSE MKT',
  'OTC',
]

/**
 * Shape of an Alpha Vantage `GLOBAL_QUOTE` response payload. All values are
 * stringified by Alpha Vantage and must be coerced before use.
 */
interface AlphaVantageGlobalQuoteResponse {
  /** The single populated key on a successful response. */
  'Global Quote'?: {
    /** Ticker symbol echoed by the API (e.g. `'AAPL'`). */
    '01. symbol': string
    /** Latest traded price as a stringified decimal. */
    '05. price': string
    /** Last trading day in `YYYY-MM-DD` form. */
    '07. latest trading day': string
  }
  /** Free-tier rate-limit canonical message. */
  Note?: string
  /** Generic upstream error message (e.g. invalid `apikey`). */
  'Error Message'?: string
  /** Descriptive informational text Alpha Vantage emits on bad symbols etc. */
  Information?: string
}

/**
 * Shape of an Alpha Vantage `TIME_SERIES_DAILY` response payload.
 */
interface AlphaVantageTimeSeriesDailyResponse {
  /** Map of `YYYY-MM-DD` → OHLCV strings. */
  'Time Series (Daily)'?: Record<string, { '4. close': string }>
  /** Free-tier rate-limit canonical message. */
  Note?: string
  /** Generic upstream error message. */
  'Error Message'?: string
  /** Descriptive informational text. */
  Information?: string
}

/**
 * Shape of an Alpha Vantage `TIME_SERIES_INTRADAY` response payload. The
 * intraday series key is dynamic (e.g. `'Time Series (60min)'`).
 */
interface AlphaVantageTimeSeriesIntradayResponse {
  Note?: string
  'Error Message'?: string
  Information?: string
  /** Index signature for the dynamic `Time Series (NNmin)` key. */
  [key: string]: unknown
}

/**
 * Shape of an Alpha Vantage `SYMBOL_SEARCH` response payload.
 */
interface AlphaVantageSymbolSearchResponse {
  bestMatches?: Array<{
    '1. symbol': string
    '2. name': string
    '4. region': string
    '8. currency': string
  }>
  Note?: string
  'Error Message'?: string
  Information?: string
}

/**
 * Shape of an Alpha Vantage `OVERVIEW` response payload (fundamentals).
 * Alpha Vantage returns `'None'` (the literal string) for missing values.
 */
interface AlphaVantageOverviewResponse {
  /** Symbol echoed by the API. */
  Symbol?: string
  /** Currency the monetary fundamentals are denominated in. */
  Currency?: string
  /** Market cap in major units, stringified. */
  MarketCapitalization?: string
  /** Trailing P/E ratio, stringified. */
  PERatio?: string
  /** Trailing earnings per share, stringified. */
  EPS?: string
  /** Trailing dividend yield as a fraction, stringified. */
  DividendYield?: string
  /** Free-tier rate-limit canonical message. */
  Note?: string
  /** Generic upstream error message. */
  'Error Message'?: string
  /** Descriptive informational text. */
  Information?: string
}

/**
 * Per-range Alpha Vantage function selection.
 *
 * Short ranges use `TIME_SERIES_INTRADAY` so the chart has enough granular
 * bars to look meaningful; longer ranges use `TIME_SERIES_DAILY` so we
 * don't overload the response.
 */
interface RangeConfig {
  /** Alpha Vantage `function` query parameter value. */
  fn: 'TIME_SERIES_DAILY' | 'TIME_SERIES_INTRADAY'
  /** Intraday `interval` parameter (only set for intraday ranges). */
  interval?: '60min'
  /** Maximum number of bars to keep, sliced from the end of the series. */
  maxBars: number
  /** Output size hint sent to Alpha Vantage. */
  outputSize: 'compact' | 'full'
}

/**
 * Maps a core {@link EquityHistoricalRange} to the Alpha Vantage function /
 * interval / size combination that best fits.
 *
 * Intraday is used for ranges shorter than a week (Alpha Vantage's free
 * intraday endpoint supports up to 2 years of `60min` data, which more than
 * covers `'1d'` and `'5d'`). Daily is used for longer ranges.
 */
const rangeConfig: Record<EquityHistoricalRange, RangeConfig> = {
  '1d': { fn: 'TIME_SERIES_INTRADAY', interval: '60min', maxBars: 8, outputSize: 'compact' },
  '5d': { fn: 'TIME_SERIES_INTRADAY', interval: '60min', maxBars: 40, outputSize: 'compact' },
  '1m': { fn: 'TIME_SERIES_DAILY', maxBars: 22, outputSize: 'compact' },
  '3m': { fn: 'TIME_SERIES_DAILY', maxBars: 66, outputSize: 'compact' },
  '6m': { fn: 'TIME_SERIES_DAILY', maxBars: 132, outputSize: 'compact' },
  '1y': { fn: 'TIME_SERIES_DAILY', maxBars: 264, outputSize: 'full' },
  '5y': { fn: 'TIME_SERIES_DAILY', maxBars: 1320, outputSize: 'full' },
  max: { fn: 'TIME_SERIES_DAILY', maxBars: Number.MAX_SAFE_INTEGER, outputSize: 'full' },
}

/**
 * Parses an Alpha Vantage stringified decimal into a `number`, returning
 * `undefined` for the literal string `'None'` or any other non-numeric
 * value (Alpha Vantage uses `'None'` as its "missing value" sentinel for
 * fundamentals).
 *
 * @param value - Stringified value from an Alpha Vantage response.
 * @returns Parsed number, or `undefined` if the value is missing/sentinel.
 */
const parseOptionalNumber = (value: string | undefined): number | undefined => {
  if (value == null || value === '' || value === 'None') {
    return undefined
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

/**
 * Returns a copy of {@link url} with the `apikey` query parameter redacted,
 * so it can safely appear in error messages and logs.
 *
 * @param url - URL string that may contain an `apikey=...` query parameter.
 * @returns The same URL with `apikey=REDACTED`.
 */
export const sanitizeUrl = (url: string): string => {
  return url.replace(/([?&])apikey=[^&]*/iu, '$1apikey=REDACTED')
}

/**
 * Detects Alpha Vantage's canonical "rate limit hit" response body and
 * raises a structured error.
 *
 * Alpha Vantage signals rate-limit exhaustion with HTTP 200 + a `Note`
 * field whose value begins with `'Thank you for using Alpha Vantage'`. We
 * also accept the same wording in the `Information` field that the API
 * sometimes uses for the standard tier.
 *
 * @param body - Parsed Alpha Vantage response body.
 * @throws {Error} If the body contains a rate-limit `Note`/`Information`.
 */
const detectRateLimit = (body: { Note?: string; Information?: string }): void => {
  const message = body.Note ?? body.Information
  if (typeof message === 'string' && /thank you for using alpha vantage/iu.test(message)) {
    throw new Error('Alpha Vantage rate limit reached. Try again shortly.', {
      cause: { code: RATE_LIMITED },
    })
  }
}

/**
 * Detects Alpha Vantage's structured upstream-error responses (`Error
 * Message`) and raises an error with a `UPSTREAM_ERROR` cause code.
 *
 * @param body - Parsed Alpha Vantage response body.
 * @throws {Error} If the body contains an `Error Message`.
 */
const detectUpstreamError = (body: { 'Error Message'?: string }): void => {
  const message = body['Error Message']
  if (typeof message === 'string' && message.length > 0) {
    throw new Error(`Alpha Vantage rejected the request: ${message}`, {
      cause: { code: UPSTREAM_ERROR },
    })
  }
}

/**
 * Resolves the configured API key, throwing a sanitized error if none is
 * available. Reads `ALPHA_VANTAGE_API_KEY` from the environment as a
 * fallback.
 *
 * @param config - Provider configuration.
 * @returns The resolved API key.
 * @throws {Error} If no API key is configured.
 */
const requireApiKey = (config: AlphaVantageEquityPricesConfig): string => {
  const key = config.apiKey ?? process.env['ALPHA_VANTAGE_API_KEY']
  if (typeof key !== 'string' || key.length === 0) {
    throw new Error(
      'Alpha Vantage API key not configured. Set ALPHA_VANTAGE_API_KEY or pass apiKey to createProvider().',
      { cause: { code: MISSING_API_KEY } },
    )
  }
  return key
}

/**
 * Issues a GET request against the Alpha Vantage `/query` endpoint and
 * parses the JSON response, with rate-limit and error-message detection.
 *
 * @param baseUrl - Resolved base URL.
 * @param params - Query parameters (function, symbol, etc.). MUST include
 *   `apikey`.
 * @param timeout - Request timeout in milliseconds.
 * @returns Parsed Alpha Vantage response payload, narrowed by `T`.
 * @throws {Error} If the upstream returns a non-OK HTTP status, a
 *   rate-limit body, or an `Error Message` body. Error messages NEVER
 *   include the API key.
 */
const fetchJson = async <
  T extends { Note?: string; Information?: string; 'Error Message'?: string },
>(
  baseUrl: string,
  params: URLSearchParams,
  timeout: number,
): Promise<T> => {
  const url = `${baseUrl}/query?${params.toString()}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) {
      throw new Error(
        `Alpha Vantage request to ${sanitizeUrl(url)} failed with status ${String(response.status)}`,
      )
    }
    const body = (await response.json()) as T
    detectRateLimit(body)
    detectUpstreamError(body)
    return body
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Builds the common query parameters every Alpha Vantage call needs.
 *
 * @param fn - Alpha Vantage `function` parameter (e.g. `'GLOBAL_QUOTE'`).
 * @param apiKey - Resolved API key.
 * @returns A pre-populated `URLSearchParams`.
 */
const buildBaseParams = (fn: string, apiKey: string): URLSearchParams => {
  const params = new URLSearchParams()
  params.set('function', fn)
  params.set('apikey', apiKey)
  return params
}

/**
 * Maps an Alpha Vantage `Global Quote` block to a normalized
 * {@link EquityQuote}.
 *
 * Alpha Vantage's free tier reports US equities only and quotes are always
 * in USD; the ISO 4217 currency is therefore hard-coded to `'USD'` (the
 * `OVERVIEW` endpoint's `Currency` field can be used for non-US tickers via
 * {@link EquityPricesProvider.getFundamentals}).
 *
 * @param symbol - Symbol the caller asked about (used as a fallback if the
 *   response omits its echo).
 * @param block - Alpha Vantage `Global Quote` block.
 * @returns Normalized {@link EquityQuote}.
 */
const mapQuote = (
  symbol: EquitySymbol,
  block: NonNullable<AlphaVantageGlobalQuoteResponse['Global Quote']>,
): EquityQuote => {
  const price = parseOptionalNumber(block['05. price'])
  if (price == null) {
    throw new Error(`Alpha Vantage returned no price for symbol ${block['01. symbol'] ?? symbol}`, {
      cause: { code: UPSTREAM_ERROR },
    })
  }
  const ts = block['07. latest trading day']
    ? new Date(`${block['07. latest trading day']}T00:00:00Z`)
    : new Date()
  return {
    symbol: block['01. symbol'] || symbol,
    price,
    currency: 'USD',
    ts,
  }
}

/**
 * Resolves the dynamic `'Time Series (NNmin)'` key on an intraday response.
 *
 * @param body - Parsed Alpha Vantage intraday response.
 * @param interval - Interval string (e.g. `'60min'`).
 * @returns The series object, or `undefined` if not present.
 */
const intradaySeries = (
  body: AlphaVantageTimeSeriesIntradayResponse,
  interval: string,
): Record<string, { '4. close': string }> | undefined => {
  const key = `Time Series (${interval})`
  const series = body[key]
  if (typeof series !== 'object' || series === null) {
    return undefined
  }
  return series as Record<string, { '4. close': string }>
}

/**
 * Maps a `Time Series (...)` map to ascending-order {@link
 * EquityHistoricalBar} entries, sliced to {@link maxBars}.
 *
 * Alpha Vantage returns the series in DESCENDING order. We reverse it so
 * the first element is the oldest, in line with the core contract.
 *
 * @param series - Time-series object keyed by ISO date/datetime.
 * @param maxBars - Maximum number of bars to return.
 * @returns Ascending-order array of historical bars.
 */
const mapTimeSeries = (
  series: Record<string, { '4. close': string }>,
  maxBars: number,
): EquityHistoricalBar[] => {
  const entries = Object.entries(series)
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  const sliced = entries.length > maxBars ? entries.slice(entries.length - maxBars) : entries
  const bars: EquityHistoricalBar[] = []
  for (const [tsString, ohlc] of sliced) {
    const close = parseOptionalNumber(ohlc['4. close'])
    if (close == null) {
      continue
    }
    // Alpha Vantage daily timestamps are `YYYY-MM-DD`; intraday is
    // `YYYY-MM-DD HH:MM:SS`. Both parse cleanly via `Date`.
    const ts = new Date(
      tsString.includes(' ') ? tsString.replace(' ', 'T') : `${tsString}T00:00:00Z`,
    )
    bars.push({ ts, close })
  }
  return bars
}

/**
 * Maps an Alpha Vantage `OVERVIEW` response to a normalized
 * {@link EquityFundamentals}.
 *
 * @param symbol - Symbol the caller asked about (used as fallback).
 * @param body - Parsed Alpha Vantage `OVERVIEW` response.
 * @returns Normalized fundamentals snapshot.
 */
const mapFundamentals = (
  symbol: EquitySymbol,
  body: AlphaVantageOverviewResponse,
): EquityFundamentals => {
  const result: EquityFundamentals = {
    symbol: body.Symbol || symbol,
  }
  const marketCap = parseOptionalNumber(body.MarketCapitalization)
  if (marketCap !== undefined) {
    result.marketCap = marketCap
  }
  const peRatio = parseOptionalNumber(body.PERatio)
  if (peRatio !== undefined) {
    result.peRatio = peRatio
  }
  const eps = parseOptionalNumber(body.EPS)
  if (eps !== undefined) {
    result.eps = eps
  }
  const dividendYield = parseOptionalNumber(body.DividendYield)
  if (dividendYield !== undefined) {
    result.dividendYield = dividendYield
  }
  if (body.Currency && body.Currency !== 'None') {
    result.currency = body.Currency
  }
  return result
}

/**
 * Maps Alpha Vantage `bestMatches` rows to normalized
 * {@link EquitySymbolMatch} entries.
 *
 * @param body - Parsed Alpha Vantage `SYMBOL_SEARCH` response.
 * @returns Array of symbol matches, possibly empty.
 */
const mapMatches = (body: AlphaVantageSymbolSearchResponse): EquitySymbolMatch[] => {
  if (!body.bestMatches || body.bestMatches.length === 0) {
    return []
  }
  return body.bestMatches.map((row) => {
    const match: EquitySymbolMatch = {
      symbol: row['1. symbol'],
      name: row['2. name'],
    }
    if (row['4. region']) {
      match.exchange = row['4. region']
    }
    if (row['8. currency']) {
      match.currency = row['8. currency']
    }
    return match
  })
}

/**
 * Creates an Alpha Vantage equity-prices provider.
 *
 * @param config - Provider configuration. The API key may be supplied here
 *   directly or via the `ALPHA_VANTAGE_API_KEY` environment variable.
 * @returns An {@link EquityPricesProvider} backed by Alpha Vantage.
 */
export const createProvider = (
  config: AlphaVantageEquityPricesConfig = {},
): EquityPricesProvider => {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL
  const timeout = config.timeout ?? DEFAULT_TIMEOUT

  return {
    async getQuote(symbol: EquitySymbol): Promise<EquityQuote> {
      const apiKey = requireApiKey(config)
      const params = buildBaseParams('GLOBAL_QUOTE', apiKey)
      params.set('symbol', symbol)
      const body = await fetchJson<AlphaVantageGlobalQuoteResponse>(baseUrl, params, timeout)
      const block = body['Global Quote']
      if (!block || !block['05. price']) {
        throw new Error(`Alpha Vantage returned no quote for symbol ${symbol}`, {
          cause: { code: UPSTREAM_ERROR },
        })
      }
      return mapQuote(symbol, block)
    },

    async getHistorical(
      symbol: EquitySymbol,
      range: EquityHistoricalRange,
    ): Promise<EquityHistoricalBar[]> {
      const apiKey = requireApiKey(config)
      const cfg = rangeConfig[range]
      const params = buildBaseParams(cfg.fn, apiKey)
      params.set('symbol', symbol)
      params.set('outputsize', cfg.outputSize)
      if (cfg.interval) {
        params.set('interval', cfg.interval)
      }
      if (cfg.fn === 'TIME_SERIES_INTRADAY' && cfg.interval) {
        const body = await fetchJson<AlphaVantageTimeSeriesIntradayResponse>(
          baseUrl,
          params,
          timeout,
        )
        const series = intradaySeries(body, cfg.interval)
        if (!series) {
          return []
        }
        return mapTimeSeries(series, cfg.maxBars)
      }
      const body = await fetchJson<AlphaVantageTimeSeriesDailyResponse>(baseUrl, params, timeout)
      const series = body['Time Series (Daily)']
      if (!series) {
        return []
      }
      return mapTimeSeries(series, cfg.maxBars)
    },

    async searchSymbol(query: string): Promise<EquitySymbolMatch[]> {
      const apiKey = requireApiKey(config)
      const params = buildBaseParams('SYMBOL_SEARCH', apiKey)
      params.set('keywords', query)
      const body = await fetchJson<AlphaVantageSymbolSearchResponse>(baseUrl, params, timeout)
      return mapMatches(body)
    },

    async getFundamentals(symbol: EquitySymbol): Promise<EquityFundamentals> {
      const apiKey = requireApiKey(config)
      const params = buildBaseParams('OVERVIEW', apiKey)
      params.set('symbol', symbol)
      const body = await fetchJson<AlphaVantageOverviewResponse>(baseUrl, params, timeout)
      return mapFundamentals(symbol, body)
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
 * Reads `ALPHA_VANTAGE_API_KEY` and (optional) `ALPHA_VANTAGE_BASE_URL`
 * from environment variables. Use {@link createProvider} directly if you
 * need to supply configuration programmatically.
 */
export const provider: EquityPricesProvider = new Proxy({} as EquityPricesProvider, {
  get(_, prop, receiver) {
    if (!_provider) {
      _provider = createProvider({
        ...(process.env['ALPHA_VANTAGE_BASE_URL']
          ? { baseUrl: process.env['ALPHA_VANTAGE_BASE_URL'] }
          : {}),
        ...(process.env['ALPHA_VANTAGE_API_KEY']
          ? { apiKey: process.env['ALPHA_VANTAGE_API_KEY'] }
          : {}),
      })
    }
    return Reflect.get(_provider, prop, receiver)
  },
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) {
      _provider = createProvider({
        ...(process.env['ALPHA_VANTAGE_BASE_URL']
          ? { baseUrl: process.env['ALPHA_VANTAGE_BASE_URL'] }
          : {}),
        ...(process.env['ALPHA_VANTAGE_API_KEY']
          ? { apiKey: process.env['ALPHA_VANTAGE_API_KEY'] }
          : {}),
      })
    }
    return Reflect.set(_provider, prop, value)
  },
})
