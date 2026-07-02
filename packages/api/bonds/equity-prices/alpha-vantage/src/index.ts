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
 * import { setProvider } from '@molecule/api-equity-prices'
 * import { provider } from '@molecule/api-equity-prices-alpha-vantage'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
