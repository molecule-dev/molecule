/**
 * OpenExchangeRates FX-rates provider for molecule.dev.
 *
 * Implements the {@link import('@molecule/api-fx-rates').FxRatesProvider}
 * interface against the JSON endpoints under
 * `https://openexchangerates.org/api/`. Free-tier accounts are locked to
 * `base=USD`, so cross-rate requests pivot through USD; paid plans
 * (`Developer`/`Enterprise`/`Unlimited`) may pass an arbitrary `base`.
 *
 * Snapshots are cached in memory for a configurable TTL (default 1h) and,
 * when the `'cache'` bond is registered, written through to it as well.
 *
 * The required `OPENEXCHANGE_APP_ID` env var (or `config.appId`) is never
 * echoed back into error messages.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-fx-rates'
 * import { provider } from '@molecule/api-fx-rates-openexchange'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
