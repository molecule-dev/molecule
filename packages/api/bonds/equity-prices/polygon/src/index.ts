/**
 * Polygon.io equity-prices provider for molecule.dev.
 *
 * Implements the `EquityPricesProvider` interface against the public
 * Polygon.io REST endpoints. Provides quotes (`/v2/last/trade`),
 * historical aggregate bars (`/v2/aggs`), symbol search
 * (`/v3/reference/tickers`), fundamentals (`/v3/reference/tickers/:symbol`
 * combined with `/vX/reference/financials`), and a list of supported
 * stock exchanges (`/v3/reference/exchanges`).
 *
 * Requires `POLYGON_API_KEY`. The provider detects HTTP 429 rate-limit
 * responses, parses any `Retry-After` header, and surfaces them via
 * `Error.cause.code === 'RATE_LIMITED'` with an optional
 * `Error.cause.retryAfterSeconds`. The API key is sanitized out of all
 * error messages.
 *
 * @example
 * ```typescript
 * import { getHistorical, getQuote, setProvider } from '@molecule/api-equity-prices'
 * import { createProvider, RATE_LIMITED } from '@molecule/api-equity-prices-polygon'
 *
 * // Startup: bond once. POLYGON_API_KEY is sent as the `apiKey` query parameter.
 * setProvider(createProvider({ apiKey: process.env.POLYGON_API_KEY }))
 *
 * try {
 *   const quote = await getQuote('AAPL') // { symbol: 'AAPL', price, currency: 'USD', ts: Date }
 *   const month = await getHistorical('AAPL', '1m') // daily bars, oldest first: [{ ts, close }]
 *   console.log(quote.price, month.length)
 * } catch (error) {
 *   const cause = (error as Error).cause as
 *     | { code?: string; retryAfterSeconds?: number }
 *     | undefined
 *   if (cause?.code !== RATE_LIMITED) throw error
 *   console.warn(`Polygon rate-limited; retry in ${cause.retryAfterSeconds ?? 60}s`)
 * }
 * ```
 *
 * @remarks
 * - **Bond through the core**: `setProvider(...)` from `@molecule/api-equity-prices`, then call
 *   the core's `getQuote` / `getHistorical` / `getFundamentals` / `searchSymbol`.
 * - Errors are plain `Error`s whose `cause` is an object — HTTP 429 gives
 *   `{ code: RATE_LIMITED, retryAfterSeconds? }` (seconds, only when Polygon sent
 *   `Retry-After`); other failures, including a body `status` other than `OK`/`DELAYED`
 *   (e.g. `NOT_AUTHORIZED` when the plan lacks an endpoint), give `{ code: UPSTREAM_ERROR }`.
 *   A missing key throws `{ code: MISSING_API_KEY }` on the first call, not at bond time.
 * - `getQuote()` reads `/v2/last/trade`, which not every Polygon plan includes; historical
 *   aggregates (`/v2/aggs`) are the broadly available endpoint.
 * - `'1m'` is one MONTH (daily bars, capped at 22); `'5y'` returns weekly bars capped at 264 and
 *   `'max'` monthly bars. Quotes are always tagged `'USD'`.
 * - `getFundamentals()` makes three requests (ticker details, financials, last trade) and sets
 *   `peRatio = price / eps` only when the last-trade call succeeds. `timeout` is milliseconds (default 10000).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
