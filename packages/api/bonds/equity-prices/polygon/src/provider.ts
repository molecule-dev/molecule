/**
 * Polygon.io implementation of EquityPricesProvider.
 *
 * Wraps the public `https://api.polygon.io/` REST endpoints:
 *
 * - `getQuote` → `/v2/last/trade/:symbol`
 * - `getHistorical` → `/v2/aggs/ticker/:symbol/range/:multiplier/:timespan/:from/:to`
 * - `searchSymbol` → `/v3/reference/tickers?search=...`
 * - `getFundamentals` → `/v3/reference/tickers/:symbol` + `/vX/reference/financials?ticker=...`
 * - `listSupportedExchanges` → `/v3/reference/exchanges?asset_class=stocks`
 *
 * Rate limits are signalled via HTTP 429 with an optional `Retry-After`
 * header. The provider detects this and surfaces it as an `Error` with
 * `cause: { code: 'RATE_LIMITED', retryAfterSeconds }` so callers can
 * distinguish it from generic upstream failures.
 *
 * The configured API key is NEVER included in error messages. Failure
 * URLs are sanitized to redact the `apiKey` query parameter.
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

import type { PolygonEquityPricesConfig } from './types.js'
import { MISSING_API_KEY, RATE_LIMITED, UPSTREAM_ERROR } from './types.js'

/** Default Polygon.io public REST endpoint base URL. */
const DEFAULT_BASE_URL = 'https://api.polygon.io'

/** Default request timeout in milliseconds. */
const DEFAULT_TIMEOUT = 10_000

/**
 * Number of bars to keep per range, applied after the upstream response
 * is received. Polygon honors arbitrary `from`/`to` ranges so we only
 * need to slice on the trailing edge.
 */
const MAX_BARS_PER_RANGE: Record<EquityHistoricalRange, number> = {
  '1d': 80,
  '5d': 80,
  '1m': 22,
  '3m': 66,
  '6m': 132,
  '1y': 264,
  '5y': 264,
  max: Number.MAX_SAFE_INTEGER,
}

/**
 * Per-range Polygon aggregate-window selection.
 *
 * Polygon's `/v2/aggs` endpoint requires `multiplier`, `timespan`, and
 * absolute `from` / `to` dates. We compute `from`/`to` at call time
 * (relative to "now") so we never hit Polygon's hard cap of 5000 bars
 * per response.
 */
interface RangeConfig {
  /** Aggregate window multiplier (e.g. `5` for `5min`). */
  multiplier: number
  /** Polygon `timespan` parameter. */
  timespan: 'minute' | 'hour' | 'day' | 'week' | 'month'
  /** Number of days back from "now" the range covers. */
  daysBack: number
}

/**
 * Maps a core {@link EquityHistoricalRange} to the Polygon aggregate
 * window that best fits.
 */
const rangeConfig: Record<EquityHistoricalRange, RangeConfig> = {
  '1d': { multiplier: 5, timespan: 'minute', daysBack: 1 },
  '5d': { multiplier: 30, timespan: 'minute', daysBack: 5 },
  '1m': { multiplier: 1, timespan: 'day', daysBack: 31 },
  '3m': { multiplier: 1, timespan: 'day', daysBack: 92 },
  '6m': { multiplier: 1, timespan: 'day', daysBack: 183 },
  '1y': { multiplier: 1, timespan: 'day', daysBack: 366 },
  '5y': { multiplier: 1, timespan: 'week', daysBack: 5 * 365 },
  max: { multiplier: 1, timespan: 'month', daysBack: 50 * 365 },
}

/** Shape of a Polygon `/v2/last/trade/:symbol` response. */
interface PolygonLastTradeResponse {
  /** Polygon status flag — `'OK'` on success. */
  status?: string
  /** Echoed ticker. */
  ticker?: string
  /** Last-trade payload. */
  results?: {
    /** Trade price in major units. */
    p?: number
    /** Trade timestamp in nanoseconds since epoch. */
    t?: number
    /** Exchange ID (numeric Polygon code). */
    x?: number
  }
  /** Error message when `status` is non-`OK`. */
  error?: string
  /** Free-form upstream message (e.g. notes about delayed data). */
  message?: string
}

/** Shape of a single bar in a Polygon `/v2/aggs` response. */
interface PolygonAggBar {
  /** Bar close price. */
  c?: number
  /** Bar timestamp in milliseconds since epoch (period start). */
  t?: number
}

/** Shape of a Polygon `/v2/aggs` response. */
interface PolygonAggregatesResponse {
  status?: string
  ticker?: string
  results?: PolygonAggBar[]
  error?: string
  message?: string
}

/** Shape of a single ticker in a Polygon `/v3/reference/tickers` response. */
interface PolygonTickerSummary {
  /** Ticker symbol (e.g. `'AAPL'`). */
  ticker?: string
  /** Human-readable security name. */
  name?: string
  /** Primary exchange MIC (e.g. `'XNAS'`). */
  primary_exchange?: string
  /** ISO 4217 currency code. */
  currency_name?: string
}

/** Shape of a Polygon `/v3/reference/tickers` (search) response. */
interface PolygonTickersResponse {
  status?: string
  results?: PolygonTickerSummary[]
  error?: string
  message?: string
}

/**
 * Shape of the per-ticker detail response at
 * `/v3/reference/tickers/:symbol`.
 */
interface PolygonTickerDetailsResponse {
  status?: string
  results?: {
    ticker?: string
    /** Currency the security trades in. */
    currency_name?: string
    /** Market capitalization in major units of `currency_name`. */
    market_cap?: number
    /** Optional weighted shares outstanding. */
    weighted_shares_outstanding?: number
  }
  error?: string
  message?: string
}

/**
 * Shape of a single financial-statement entry in the
 * `/vX/reference/financials` response. Polygon nests metric values under
 * `financials.income_statement` etc., each as `{ value, unit, ... }`.
 */
interface PolygonFinancialsEntry {
  financials?: {
    income_statement?: {
      basic_earnings_per_share?: { value?: number }
      diluted_earnings_per_share?: { value?: number }
    }
  }
}

/** Shape of a Polygon `/vX/reference/financials` response. */
interface PolygonFinancialsResponse {
  status?: string
  results?: PolygonFinancialsEntry[]
  error?: string
  message?: string
}

/** Shape of a single exchange in a Polygon `/v3/reference/exchanges` response. */
interface PolygonExchangeSummary {
  /** Polygon's per-exchange short identifier (e.g. `'NASDAQ'`). */
  acronym?: string
  /** ISO 10383 Market Identifier Code (e.g. `'XNAS'`). */
  mic?: string
  /** Operating MIC (e.g. `'XNAS'`). */
  operating_mic?: string
  /** Asset class — we filter for `'stocks'`. */
  asset_class?: string
  /** Exchange type — `'exchange'` for venues, `'TRF'` for trade-reporting facilities. */
  type?: string
  /** Human name of the exchange. */
  name?: string
}

/** Shape of a Polygon `/v3/reference/exchanges` response. */
interface PolygonExchangesResponse {
  status?: string
  results?: PolygonExchangeSummary[]
  error?: string
  message?: string
}

/**
 * Returns a copy of {@link url} with the `apiKey` query parameter
 * redacted, so it can safely appear in error messages and logs. Polygon
 * uses camelCase `apiKey` (compare Alpha Vantage's lowercase `apikey`).
 *
 * @param url - URL string that may contain an `apiKey=...` query parameter.
 * @returns The same URL with `apiKey=REDACTED`.
 */
export const sanitizeUrl = (url: string): string => {
  return url.replace(/([?&])apiKey=[^&]*/iu, '$1apiKey=REDACTED')
}

/**
 * Resolves the configured API key, throwing a sanitized error if none is
 * available. Reads `POLYGON_API_KEY` from the environment as a fallback.
 *
 * @param config - Provider configuration.
 * @returns The resolved API key.
 * @throws {Error} If no API key is configured.
 */
const requireApiKey = (config: PolygonEquityPricesConfig): string => {
  const key = config.apiKey ?? process.env['POLYGON_API_KEY']
  if (typeof key !== 'string' || key.length === 0) {
    throw new Error(
      'Polygon.io API key not configured. Set POLYGON_API_KEY or pass apiKey to createProvider().',
      { cause: { code: MISSING_API_KEY } },
    )
  }
  return key
}

/**
 * Parses a `Retry-After` header value into seconds. Polygon may emit
 * either an integer number of seconds or an HTTP-date. Returns
 * `undefined` for missing / unparseable values.
 *
 * @param header - Raw `Retry-After` header value.
 * @returns Seconds until the caller may retry, or `undefined`.
 */
const parseRetryAfter = (header: string | null): number | undefined => {
  if (header === null) {
    return undefined
  }
  const trimmed = header.trim()
  if (trimmed === '') {
    return undefined
  }
  const seconds = Number(trimmed)
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.ceil(seconds)
  }
  const date = Date.parse(trimmed)
  if (Number.isFinite(date)) {
    const delta = Math.ceil((date - Date.now()) / 1000)
    return delta > 0 ? delta : 0
  }
  return undefined
}

/**
 * Issues a GET request against a Polygon REST path and parses the JSON
 * response, with rate-limit and error-message detection.
 *
 * @param baseUrl - Resolved Polygon base URL (no trailing slash).
 * @param path - Request path including a leading slash (e.g.
 *   `'/v2/last/trade/AAPL'`).
 * @param params - Query parameters (must include `apiKey`).
 * @param timeout - Request timeout in milliseconds.
 * @returns Parsed Polygon response payload, narrowed by `T`.
 * @throws {Error} If the upstream returns HTTP 429 (rate limit), a
 *   non-OK status, or a body whose `status` field signals an error. Error
 *   messages NEVER include the API key.
 */
const fetchJson = async <T extends { status?: string; error?: string; message?: string }>(
  baseUrl: string,
  path: string,
  params: URLSearchParams,
  timeout: number,
): Promise<T> => {
  const url = `${baseUrl}${path}?${params.toString()}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (response.status === 429) {
      const retryAfter = parseRetryAfter(response.headers.get('Retry-After'))
      const cause: { code: typeof RATE_LIMITED; retryAfterSeconds?: number } = {
        code: RATE_LIMITED,
      }
      if (retryAfter !== undefined) {
        cause.retryAfterSeconds = retryAfter
      }
      throw new Error('Polygon.io rate limit reached. Try again shortly.', { cause })
    }
    if (!response.ok) {
      throw new Error(
        `Polygon.io request to ${sanitizeUrl(url)} failed with status ${String(response.status)}`,
        { cause: { code: UPSTREAM_ERROR } },
      )
    }
    const body = (await response.json()) as T
    if (typeof body.status === 'string' && body.status !== 'OK' && body.status !== 'DELAYED') {
      const detail = body.error ?? body.message ?? body.status
      throw new Error(`Polygon.io rejected the request: ${detail}`, {
        cause: { code: UPSTREAM_ERROR },
      })
    }
    return body
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Builds a `URLSearchParams` containing the API key and any additional
 * parameters supplied by the caller.
 *
 * @param apiKey - Resolved API key.
 * @param extras - Additional `[name, value]` pairs to set.
 * @returns A pre-populated `URLSearchParams`.
 */
const buildParams = (apiKey: string, extras: Array<[string, string]> = []): URLSearchParams => {
  const params = new URLSearchParams()
  for (const [k, v] of extras) {
    params.set(k, v)
  }
  // Set apiKey LAST so any caller-supplied `apiKey=...` is overridden by
  // the resolved value.
  params.set('apiKey', apiKey)
  return params
}

/**
 * Formats a `Date` as `YYYY-MM-DD` in UTC. Polygon's aggregates endpoint
 * accepts both ms-since-epoch and ISO date strings; the date form makes
 * the resulting URL human-readable in error messages.
 *
 * @param date - The date to format.
 * @returns ISO date string (`YYYY-MM-DD`).
 */
const toIsoDate = (date: Date): string => {
  const yyyy = String(date.getUTCFullYear()).padStart(4, '0')
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/**
 * Maps a Polygon `/v2/last/trade` body to a normalized {@link EquityQuote}.
 *
 * Polygon's last-trade endpoint reports the trade price in USD for US
 * equities. Non-US tickers get their currency via
 * {@link EquityPricesProvider.getFundamentals}; for the quote we default
 * to `'USD'`.
 *
 * @param symbol - Symbol the caller asked about (used as fallback if the
 *   response omits its echo).
 * @param body - Parsed Polygon last-trade response.
 * @returns Normalized {@link EquityQuote}.
 */
const mapQuote = (symbol: EquitySymbol, body: PolygonLastTradeResponse): EquityQuote => {
  const result = body.results
  if (!result || typeof result.p !== 'number' || !Number.isFinite(result.p)) {
    throw new Error(`Polygon.io returned no quote for symbol ${symbol}`, {
      cause: { code: UPSTREAM_ERROR },
    })
  }
  const ts =
    typeof result.t === 'number' && Number.isFinite(result.t)
      ? new Date(Math.floor(result.t / 1_000_000))
      : new Date()
  return {
    symbol: body.ticker || symbol,
    price: result.p,
    currency: 'USD',
    ts,
  }
}

/**
 * Maps Polygon `/v2/aggs` results to ascending-order
 * {@link EquityHistoricalBar} entries, sliced to {@link maxBars}.
 *
 * @param results - Aggregates results array (already in ascending order
 *   per Polygon's contract).
 * @param maxBars - Maximum number of bars to return.
 * @returns Ascending-order array of historical bars.
 */
const mapAggregates = (
  results: PolygonAggBar[] | undefined,
  maxBars: number,
): EquityHistoricalBar[] => {
  if (!results || results.length === 0) {
    return []
  }
  const sliced = results.length > maxBars ? results.slice(results.length - maxBars) : results
  const bars: EquityHistoricalBar[] = []
  for (const bar of sliced) {
    if (
      typeof bar.c !== 'number' ||
      !Number.isFinite(bar.c) ||
      typeof bar.t !== 'number' ||
      !Number.isFinite(bar.t)
    ) {
      continue
    }
    bars.push({ ts: new Date(bar.t), close: bar.c })
  }
  return bars
}

/**
 * Maps Polygon `/v3/reference/tickers` rows to normalized
 * {@link EquitySymbolMatch} entries.
 *
 * @param body - Parsed Polygon tickers-search response.
 * @returns Array of symbol matches, possibly empty.
 */
const mapMatches = (body: PolygonTickersResponse): EquitySymbolMatch[] => {
  if (!body.results || body.results.length === 0) {
    return []
  }
  const matches: EquitySymbolMatch[] = []
  for (const row of body.results) {
    if (!row.ticker || !row.name) {
      continue
    }
    const match: EquitySymbolMatch = {
      symbol: row.ticker,
      name: row.name,
    }
    if (row.primary_exchange) {
      match.exchange = row.primary_exchange
    }
    if (row.currency_name) {
      match.currency = row.currency_name.toUpperCase()
    }
    matches.push(match)
  }
  return matches
}

/**
 * Combines a Polygon ticker-details response with a financials response
 * into a normalized {@link EquityFundamentals}.
 *
 * Polygon's free `/vX/reference/financials` endpoint exposes EPS but
 * does NOT directly publish a P/E ratio. When a recent quote price is
 * available we compute `peRatio = price / eps`; otherwise the field is
 * left undefined.
 *
 * @param symbol - Symbol the caller asked about (used as fallback).
 * @param details - Parsed `/v3/reference/tickers/:symbol` response.
 * @param financials - Parsed `/vX/reference/financials` response.
 * @param latestPrice - Latest known price for {@link symbol}, used to
 *   approximate P/E when EPS is available. Optional.
 * @returns Normalized fundamentals snapshot.
 */
const mapFundamentals = (
  symbol: EquitySymbol,
  details: PolygonTickerDetailsResponse,
  financials: PolygonFinancialsResponse,
  latestPrice: number | undefined,
): EquityFundamentals => {
  const result: EquityFundamentals = {
    symbol: details.results?.ticker || symbol,
  }
  if (details.results) {
    if (
      typeof details.results.market_cap === 'number' &&
      Number.isFinite(details.results.market_cap)
    ) {
      result.marketCap = details.results.market_cap
    }
    if (details.results.currency_name) {
      result.currency = details.results.currency_name.toUpperCase()
    }
  }
  const recent = financials.results?.[0]?.financials?.income_statement
  // Prefer diluted EPS over basic when both are present (more
  // conservative, matches how most analysts quote PE).
  const eps = recent?.diluted_earnings_per_share?.value ?? recent?.basic_earnings_per_share?.value
  if (typeof eps === 'number' && Number.isFinite(eps)) {
    result.eps = eps
    if (typeof latestPrice === 'number' && Number.isFinite(latestPrice) && eps !== 0) {
      result.peRatio = latestPrice / eps
    }
  }
  return result
}

/**
 * Maps Polygon `/v3/reference/exchanges` rows to a sorted, de-duplicated
 * list of {@link ExchangeCode} values for stock asset classes.
 *
 * Polygon returns Market Identifier Codes (MICs) for traditional venues
 * (`'XNAS'`, `'XNYS'`, etc.) and for trade-reporting facilities
 * (`'FINRA'`, `'TRF'`, etc.). We keep `type === 'exchange'` rows only
 * and surface the friendly `acronym` (`'NASDAQ'`, `'NYSE'`) when present,
 * falling back to the MIC.
 *
 * @param body - Parsed Polygon exchanges response.
 * @returns Sorted, de-duplicated array of exchange identifiers.
 */
const mapExchanges = (body: PolygonExchangesResponse): ExchangeCode[] => {
  if (!body.results || body.results.length === 0) {
    return []
  }
  const seen = new Set<ExchangeCode>()
  for (const row of body.results) {
    if (row.type && row.type !== 'exchange') {
      continue
    }
    const code = row.acronym ?? row.mic ?? row.operating_mic
    if (typeof code === 'string' && code.length > 0) {
      seen.add(code)
    }
  }
  return [...seen].sort()
}

/**
 * Creates a Polygon.io equity-prices provider.
 *
 * @param config - Provider configuration. The API key may be supplied
 *   here directly or via the `POLYGON_API_KEY` environment variable.
 * @returns An {@link EquityPricesProvider} backed by Polygon.io.
 */
export const createProvider = (config: PolygonEquityPricesConfig = {}): EquityPricesProvider => {
  const baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/u, '')
  const timeout = config.timeout ?? DEFAULT_TIMEOUT

  const fetchQuote = async (symbol: EquitySymbol): Promise<EquityQuote> => {
    const apiKey = requireApiKey(config)
    const params = buildParams(apiKey)
    const body = await fetchJson<PolygonLastTradeResponse>(
      baseUrl,
      `/v2/last/trade/${encodeURIComponent(symbol)}`,
      params,
      timeout,
    )
    return mapQuote(symbol, body)
  }

  return {
    getQuote: fetchQuote,

    async getHistorical(
      symbol: EquitySymbol,
      range: EquityHistoricalRange,
    ): Promise<EquityHistoricalBar[]> {
      const apiKey = requireApiKey(config)
      const cfg = rangeConfig[range]
      const to = new Date()
      const from = new Date(to.getTime() - cfg.daysBack * 24 * 60 * 60 * 1000)
      const params = buildParams(apiKey, [
        ['adjusted', 'true'],
        ['sort', 'asc'],
        ['limit', '5000'],
      ])
      const path =
        `/v2/aggs/ticker/${encodeURIComponent(symbol)}` +
        `/range/${String(cfg.multiplier)}/${cfg.timespan}` +
        `/${toIsoDate(from)}/${toIsoDate(to)}`
      const body = await fetchJson<PolygonAggregatesResponse>(baseUrl, path, params, timeout)
      return mapAggregates(body.results, MAX_BARS_PER_RANGE[range])
    },

    async searchSymbol(query: string): Promise<EquitySymbolMatch[]> {
      const apiKey = requireApiKey(config)
      const params = buildParams(apiKey, [
        ['search', query],
        ['active', 'true'],
        ['market', 'stocks'],
        ['limit', '10'],
      ])
      const body = await fetchJson<PolygonTickersResponse>(
        baseUrl,
        '/v3/reference/tickers',
        params,
        timeout,
      )
      return mapMatches(body)
    },

    async getFundamentals(symbol: EquitySymbol): Promise<EquityFundamentals> {
      const apiKey = requireApiKey(config)
      const detailsParams = buildParams(apiKey)
      const detailsPromise = fetchJson<PolygonTickerDetailsResponse>(
        baseUrl,
        `/v3/reference/tickers/${encodeURIComponent(symbol)}`,
        detailsParams,
        timeout,
      )
      const financialsParams = buildParams(apiKey, [
        ['ticker', symbol],
        ['limit', '1'],
      ])
      const financialsPromise = fetchJson<PolygonFinancialsResponse>(
        baseUrl,
        '/vX/reference/financials',
        financialsParams,
        timeout,
      )
      // Fetch the latest quote price in parallel so we can derive a P/E
      // ratio from EPS. Failures here are non-fatal — fundamentals work
      // without a quote, just without `peRatio`.
      let latestPrice: number | undefined
      const quotePromise = fetchQuote(symbol).then(
        (q) => {
          latestPrice = q.price
        },
        () => {
          /* swallow: fundamentals must still resolve if the quote 404s */
        },
      )
      const [details, financials] = await Promise.all([
        detailsPromise,
        financialsPromise,
        quotePromise,
      ])
      return mapFundamentals(symbol, details, financials, latestPrice)
    },

    async listSupportedExchanges(): Promise<ExchangeCode[]> {
      const apiKey = requireApiKey(config)
      const params = buildParams(apiKey, [['asset_class', 'stocks']])
      const body = await fetchJson<PolygonExchangesResponse>(
        baseUrl,
        '/v3/reference/exchanges',
        params,
        timeout,
      )
      return mapExchanges(body)
    },
  }
}

/** Lazily-initialized default provider. */
let _provider: EquityPricesProvider | null = null

/**
 * The default provider implementation, lazily initialized on first use.
 *
 * Reads `POLYGON_API_KEY` and (optional) `POLYGON_BASE_URL` from
 * environment variables. Use {@link createProvider} directly if you need
 * to supply configuration programmatically.
 */
export const provider: EquityPricesProvider = new Proxy({} as EquityPricesProvider, {
  get(_, prop, receiver) {
    if (!_provider) {
      _provider = createProvider({
        ...(process.env['POLYGON_BASE_URL'] ? { baseUrl: process.env['POLYGON_BASE_URL'] } : {}),
        ...(process.env['POLYGON_API_KEY'] ? { apiKey: process.env['POLYGON_API_KEY'] } : {}),
      })
    }
    return Reflect.get(_provider, prop, receiver)
  },
})
