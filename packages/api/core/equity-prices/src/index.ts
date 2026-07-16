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
 * @remarks
 * - **Server-side only.** Provider API keys are secrets; fetch quotes in API
 *   handlers/jobs and serve the UI through the app's own endpoints.
 * - **Cache aggressively.** Free market-data tiers are severely rate-limited
 *   (some to a few dozen calls per DAY) — a `getQuote()` per page render
 *   exhausts the quota. Cache quotes server-side and refresh on an interval,
 *   not per request.
 * - **Symbols and exchanges are provider catalogues, not universal.** Resolve
 *   user input through `searchSymbol()` instead of assuming a ticker exists,
 *   and store what the provider returned.
 * - **`EquityFundamentals` fields are optional by contract** — treat a missing
 *   field as "unknown", never as zero (an absent P/E is not a `0` P/E).
 * - Quotes carry an explicit ISO 4217 `currency` — format prices with it;
 *   never hardcode `$`.
 * - `getHistorical(symbol, range)` takes an enum range (`'1d'`…`'5y'`,
 *   `'max'`); bars return in ascending chronological order.
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
