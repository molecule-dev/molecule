/**
 * ECB FX-rates provider for molecule.dev.
 *
 * Implements the {@link import('@molecule/api-fx-rates').FxRatesProvider}
 * interface against the European Central Bank's public reference-rate XML
 * feeds (`eurofxref-daily.xml` and `eurofxref-hist-90d.xml`). Both feeds are
 * keyless, free, and EUR-pivoted. Cross-rates are computed by pivoting
 * through EUR (`USD->GBP = rates[GBP] / rates[USD]`).
 *
 * Snapshots are cached in memory for a configurable TTL (default 1h) and,
 * when the `'cache'` bond is registered, written through to it as well.
 *
 * @example
 * ```typescript
 * import { convert, getDailyRates, getRate, setProvider } from '@molecule/api-fx-rates'
 * import { createProvider } from '@molecule/api-fx-rates-ecb'
 *
 * // Startup: bond once. Keyless — no env vars. cacheTtlMs is MILLISECONDS (default 1h).
 * setProvider(createProvider({ cacheTtlMs: 60 * 60 * 1000 }))
 *
 * const usdToGbp = await getRate('USD', 'GBP') // e.g. 0.8 (1 USD = 0.8 GBP), via EUR
 * const pence = await convert(12_50, 'USD', 'GBP') // $12.50 in cents → 1000 (integer pence)
 * const today = await getDailyRates() // { pivot: 'EUR', asOf: Date, rates: { EUR: 1, USD: 1.1, … } }
 * console.log(usdToGbp, pence, today.asOf.toISOString().slice(0, 10))
 * ```
 *
 * @remarks
 * - **Bond through the core**: `setProvider(...)` from `@molecule/api-fx-rates`, then call the
 *   core's `getRate` / `convert` / `getDailyRates` / `listSupportedCurrencies`.
 * - `convert()` takes and returns INTEGER MINOR UNITS (cents), rounded — and it does NOT
 *   rescale between currencies with different decimals (USD cents → JPY yen is
 *   `amount * rate`, so adjust the scale yourself).
 * - Rates are ECB reference rates: ~40 currencies, published once per TARGET business day
 *   (around 16:00 CET) — not live market prices, and no crypto. An unlisted code throws
 *   ("does not include source currency").
 * - `{ asOf }` looks back only 90 days (the `eurofxref-hist-90d.xml` feed) and returns the
 *   latest publication at or before that date (weekends resolve to Friday); older dates throw.
 * - Snapshots are cached in memory per provider instance and, if a `cache` bond is wired,
 *   written through to it (TTL in seconds there). `timeout` is milliseconds (default 10000).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
