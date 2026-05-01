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
 * import { setProvider } from '@molecule/api-equity-prices'
 * import { provider } from '@molecule/api-equity-prices-polygon'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
