/**
 * Provider-agnostic equity-prices interface for molecule.dev.
 *
 * Defines the `EquityPricesProvider` interface for stock / ETF / fund
 * quotes, historical bars, fundamentals, and symbol search. Bond packages
 * (Alpha Vantage, IEX Cloud, Polygon.io, etc.) implement this interface.
 * Application code uses the convenience functions (`getQuote`,
 * `getHistorical`, `getFundamentals`, `searchSymbol`,
 * `listSupportedExchanges`) which delegate to the bonded provider.
 *
 * Quotes carry an explicit ISO 4217 currency so multi-exchange callers can
 * reconcile prices across markets. Symbols and exchange codes are kept as
 * plain strings so providers can support whatever catalogue they expose.
 *
 * @example
 * ```typescript
 * import { setProvider, getQuote, getHistorical } from '@molecule/api-equity-prices'
 * import { provider as alphaVantage } from '@molecule/api-equity-prices-alpha-vantage'
 *
 * setProvider(alphaVantage)
 * const quote = await getQuote('AAPL')
 * const bars = await getHistorical('AAPL', '1y')
 * ```
 *
 * @module
 */

// Type exports
export * from './types.js'

// Provider exports
export * from './provider.js'
