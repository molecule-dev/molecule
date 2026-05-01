/**
 * Provider-agnostic foreign-exchange rates interface for molecule.dev.
 *
 * Defines the `FxRatesProvider` interface for currency conversion and daily
 * reference-rate lookups. Bond packages (ECB, OpenExchange, etc.) implement
 * this interface. Application code uses the convenience functions
 * (`getRate`, `getDailyRates`, `convert`, `listSupportedCurrencies`) which
 * delegate to the bonded provider.
 *
 * Rates are normalized as plain `number` ratios: `1 unit of FROM = rate units of TO`.
 * Currency codes are ISO 4217 three-letter strings (e.g. `'USD'`, `'EUR'`, `'JPY'`).
 * Amounts are integer minor units (cents) to avoid floating-point drift.
 *
 * @example
 * ```typescript
 * import { setProvider, getRate, convert } from '@molecule/api-fx-rates'
 * import { provider as ecb } from '@molecule/api-fx-rates-ecb'
 *
 * setProvider(ecb)
 * const eurUsd = await getRate('EUR', 'USD')
 * const usdCents = await convert(10_000, 'EUR', 'USD') // 10000 EUR cents -> USD cents
 * ```
 *
 * @module
 */

// Type exports
export * from './types.js'

// Provider exports
export * from './provider.js'
