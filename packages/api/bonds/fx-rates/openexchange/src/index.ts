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
 * import { convert, getRate, setProvider } from '@molecule/api-fx-rates'
 * import { createProvider } from '@molecule/api-fx-rates-openexchange'
 *
 * // Startup: bond once. App ID from https://openexchangerates.org/account/app-ids
 * setProvider(createProvider({ appId: process.env.OPENEXCHANGE_APP_ID }))
 *
 * const eurToGbp = await getRate('EUR', 'GBP') // cross rate via the USD pivot, e.g. 0.8545
 * const pence = await convert(25_00, 'EUR', 'GBP') // €25.00 in cents → integer pence
 * const lastYear = await getRate('USD', 'EUR', { asOf: new Date('2025-09-24') }) // historical
 * console.log(eurToGbp, pence, lastYear)
 * ```
 *
 * @remarks
 * - **Bond through the core**: `setProvider(...)` from `@molecule/api-fx-rates`, then call the
 *   core's `getRate` / `convert` / `getDailyRates` / `listSupportedCurrencies`.
 * - **Leave `base` unset on the free plan.** Free App IDs are locked to `base=USD` (a
 *   different `base` is rejected upstream); cross rates are computed through USD anyway.
 * - `convert()` takes and returns INTEGER MINOR UNITS (cents), rounded — it does NOT rescale
 *   between currencies with different decimals (e.g. USD → JPY).
 * - `{ asOf }` calls `historical/YYYY-MM-DD.json` (the UTC date of `asOf`). A missing App ID
 *   throws on the first call, not at bond time; `createProvider()` falls back to
 *   `OPENEXCHANGE_APP_ID` when `appId` is omitted. Non-OK responses (401 bad ID, 429 quota)
 *   throw a plain `Error` naming the status, with the `app_id` redacted.
 * - Snapshots are cached in memory for `cacheTtlMs` (MILLISECONDS, default 1h) and written
 *   through to a `cache` bond when one is wired. `timeout` is milliseconds (default 10000).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
