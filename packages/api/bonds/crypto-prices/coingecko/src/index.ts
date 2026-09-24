/**
 * CoinGecko crypto-prices provider for molecule.dev.
 *
 * Implements the `CryptoPricesProvider` interface against the CoinGecko v3
 * API. The public endpoint (`https://api.coingecko.com/api/v3`) is keyless
 * and free for personal / non-commercial use, with conservative
 * rate-limits. Setting the `COINGECKO_API_KEY` environment variable
 * switches to the Pro endpoint (`https://pro-api.coingecko.com/api/v3`)
 * and authenticates with the `x-cg-pro-api-key` header.
 *
 * @example
 * ```typescript
 * import { getHistorical, getPrice, listCoins, setProvider } from '@molecule/api-crypto-prices'
 * import { CoinGeckoRateLimitedError, provider } from '@molecule/api-crypto-prices-coingecko'
 *
 * // Startup: bond once. `provider` reads COINGECKO_API_KEY (optional) on first use.
 * setProvider(provider)
 *
 * try {
 *   // Coin IDS, not ticker symbols: 'bitcoin', not 'BTC'.
 *   const btc = await getPrice('bitcoin', 'usd') // { id, vsCurrency, price, change24h, asOf }
 *   const top10 = await listCoins({ vsCurrency: 'usd', limit: 10 }) // by market cap, desc
 *   const week = await getHistorical('ethereum', 7, 'usd') // Array<{ ts: Date; price: number }>
 *   console.log(btc.price, top10.length, week.length)
 * } catch (error) {
 *   if (error instanceof CoinGeckoRateLimitedError) {
 *     // HTTP 429 — back off; retryAfterSeconds is null when CoinGecko sent no Retry-After.
 *     console.warn(`CoinGecko rate-limited; retry in ${error.retryAfterSeconds ?? 60}s`)
 *   } else {
 *     throw error
 *   }
 * }
 * ```
 *
 * @remarks
 * - **Wire it through the core**: `setProvider(provider)` from `@molecule/api-crypto-prices`,
 *   then call `getPrice` / `listCoins` / `getHistorical` / `getMarketStats` from the core.
 * - **IDs are CoinGecko coin ids** (`'bitcoin'`, `'ethereum'`), not ticker symbols (`'BTC'`).
 *   An unknown id makes `getPrice` throw ("returned no price data"); `listSupportedSymbols()`
 *   returns the valid ids. `vsCurrency` is lowercase (`'usd'`, default) — not `'USD'`.
 * - **The free public API is rate-limited hard.** Expect `CoinGeckoRateLimitedError`
 *   (`code === RATE_LIMITED`) under load; cache results (e.g. `@molecule/api-cache`
 *   `getOrSet`) instead of calling per request. Setting `COINGECKO_API_KEY` switches to the Pro
 *   host with the `x-cg-pro-api-key` header only — a Demo-plan key (`x-cg-demo-api-key`) is not
 *   supported; leave the variable unset to use the keyless public API.
 * - `getHistorical(id, days)` takes a number of DAYS; points are `{ ts: Date, price }`.
 * - Only the lazy `provider` reads env vars (`COINGECKO_API_KEY`, `COINGECKO_BASE_URL`);
 *   `createProvider({ apiKey, baseUrl, timeout })` uses only what you pass. `timeout` is ms.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
