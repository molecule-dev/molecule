/**
 * IEX Cloud equity-prices provider for molecule.dev.
 *
 * Implements the `EquityPricesProvider` interface against the public IEX
 * Cloud `https://cloud.iexapis.com/stable/` endpoints. Provides quotes
 * (`/stock/:symbol/quote`), historical bars (`/stock/:symbol/chart/:range`),
 * symbol search (`/search/:query`), and fundamentals
 * (`/stock/:symbol/company` + `/stock/:symbol/stats`).
 *
 * Requires `IEX_API_KEY`. The provider detects HTTP `402 Payment Required`
 * (IEX Cloud's quota-exhausted / paid-tier-required signal) and surfaces
 * it via `Error.cause.code === 'RATE_LIMITED'`. The API key is sanitized
 * out of all error messages.
 *
 * @example
 * ```typescript
 * import { getFundamentals, getQuote, setProvider } from '@molecule/api-equity-prices'
 * import { createProvider, RATE_LIMITED } from '@molecule/api-equity-prices-iex'
 *
 * // Startup: bond once. IEX_API_KEY is sent as the `token` query parameter.
 * setProvider(createProvider({ apiKey: process.env.IEX_API_KEY }))
 *
 * try {
 *   const quote = await getQuote('AAPL') // { symbol, price, currency: 'USD', ts: Date, exchange? }
 *   const stats = await getFundamentals('AAPL') // { symbol, marketCap?, peRatio?, eps?, dividendYield? }
 *   console.log(quote.price, stats.dividendYield) // dividendYield is a FRACTION: 0.0052 = 0.52%
 * } catch (error) {
 *   const cause = (error as Error).cause as { code?: string } | undefined
 *   if (cause?.code !== RATE_LIMITED) throw error
 *   console.warn('IEX Cloud quota exhausted (HTTP 402); upgrade the plan or retry next cycle')
 * }
 * ```
 *
 * @remarks
 * - **Bond through the core**: `setProvider(...)` from `@molecule/api-equity-prices`, then call
 *   the core's `getQuote` / `getHistorical` / `getFundamentals` / `searchSymbol`.
 * - Quota exhaustion is HTTP **402** (not 429); the bond surfaces it as an `Error` whose
 *   `cause` is the plain object `{ code: RATE_LIMITED }`. Other non-OK statuses carry
 *   `{ code: UPSTREAM_ERROR }`; a missing key throws `{ code: MISSING_API_KEY }` on the first
 *   call (not at bond time). `createProvider()` falls back to `IEX_API_KEY` when `apiKey` is
 *   omitted.
 * - `getFundamentals()` makes TWO requests (`/company` + `/stats`) and divides IEX's percentage
 *   `dividendYield` by 100 — the result is a fraction.
 * - IEX Cloud retired its public API in 2024; `baseUrl` (or `IEX_BASE_URL` for the lazy
 *   `provider`) points the bond at a compatible endpoint. `timeout` is milliseconds
 *   (default 10000).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
