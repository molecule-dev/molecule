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
 * import { setProvider } from '@molecule/api-equity-prices'
 * import { provider } from '@molecule/api-equity-prices-iex'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
