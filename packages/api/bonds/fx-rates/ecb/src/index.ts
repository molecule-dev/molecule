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
 * import { setProvider } from '@molecule/api-fx-rates'
 * import { provider } from '@molecule/api-fx-rates-ecb'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
