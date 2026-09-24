/**
 * Alpha Vantage equity-prices provider for molecule.dev.
 *
 * Implements the `EquityPricesProvider` interface against the public Alpha
 * Vantage `https://www.alphavantage.co/query` endpoint. Provides quotes
 * (`GLOBAL_QUOTE`), historical bars (`TIME_SERIES_DAILY` /
 * `TIME_SERIES_INTRADAY`), symbol search (`SYMBOL_SEARCH`), and
 * fundamentals (`OVERVIEW`).
 *
 * Requires `ALPHA_VANTAGE_API_KEY` (free tier: 5 requests / minute, 500 /
 * day). The provider detects Alpha Vantage's canonical rate-limit response
 * and surfaces it via `Error.cause.code === 'RATE_LIMITED'`. The API key
 * is sanitized out of all error messages.
 *
 * @example
 * ```typescript
 * import { getHistorical, getQuote, setProvider } from '@molecule/api-equity-prices'
 * import { createProvider, RATE_LIMITED } from '@molecule/api-equity-prices-alpha-vantage'
 *
 * // Startup: bond once. Free key: https://www.alphavantage.co/support/#api-key
 * setProvider(createProvider({ apiKey: process.env.ALPHA_VANTAGE_API_KEY }))
 *
 * try {
 *   const quote = await getQuote('AAPL') // { symbol: 'AAPL', price: 189.42, currency: 'USD', ts: Date }
 *   const month = await getHistorical('AAPL', '1m') // ~22 daily bars, oldest first: [{ ts, close }]
 *   console.log(quote.price, month.length)
 * } catch (error) {
 *   const cause = (error as Error).cause as { code?: string } | undefined
 *   if (cause?.code !== RATE_LIMITED) throw error
 *   console.warn('Alpha Vantage free tier exhausted (5/min, 500/day); retry later')
 * }
 * ```
 *
 * @remarks
 * - **Bond through the core**: `setProvider(...)` from `@molecule/api-equity-prices`, then call
 *   the core's `getQuote` / `getHistorical` / `getFundamentals` / `searchSymbol`.
 * - **Rate limits come back as HTTP 200** with a "Thank you for using Alpha Vantage" note; the
 *   bond turns that into an `Error` whose `cause` is `{ code: RATE_LIMITED }` (a plain object,
 *   not a custom error class — there is nothing to `instanceof`). Cache quotes instead of
 *   calling per request.
 * - A missing key does NOT fail at bond time: every call throws with
 *   `cause.code === MISSING_API_KEY`. `createProvider()` falls back to `ALPHA_VANTAGE_API_KEY`
 *   when `apiKey` is omitted.
 * - Ranges are `'1d' | '5d' | '1m' | '3m' | '6m' | '1y' | '5y' | 'max'` — `'1m'` is one MONTH.
 *   `'1d'`/`'5d'` use 60-minute intraday bars; longer ranges are daily closes. Bars carry only
 *   `{ ts, close }`, oldest first.
 * - Quotes are always reported in `'USD'` (the free tier covers US listings); use
 *   `getFundamentals()` for a ticker's own currency. `timeout` is milliseconds (default 10000).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
