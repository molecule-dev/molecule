/**
 * CoinMarketCap crypto-prices provider for molecule.dev.
 *
 * Implements the `CryptoPricesProvider` interface against the CoinMarketCap
 * Pro v1 API (`https://pro-api.coinmarketcap.com/v1`). Authentication is
 * required: set the `COINMARKETCAP_API_KEY` environment variable (or pass
 * `apiKey` to {@link createProvider}); the provider sends it in the
 * `X-CMC_PRO_API_KEY` header on every request.
 *
 * @example
 * ```typescript
 * import { getMarketStats, getPrice, listCoins, setProvider } from '@molecule/api-crypto-prices'
 * import {
 *   CoinMarketCapRateLimitedError,
 *   createProvider,
 * } from '@molecule/api-crypto-prices-coinmarketcap'
 *
 * // Startup: bond once. The CMC Pro API REQUIRES a key — every call 401s without one.
 * setProvider(createProvider({ apiKey: process.env.COINMARKETCAP_API_KEY, timeout: 10_000 }))
 *
 * try {
 *   const btc = await getPrice('BTC', 'usd') // ticker symbol → { id: 'BTC', price, change24h, asOf }
 *   const top10 = await listCoins({ vsCurrency: 'usd', limit: 10 }) // ids are CMC numeric ids
 *   const leader = await getMarketStats(top10[0]?.id ?? '1', 'usd') // '1' = Bitcoin
 *   console.log(btc.price, leader.marketCap, leader.volume24h)
 * } catch (error) {
 *   if (error instanceof CoinMarketCapRateLimitedError) {
 *     // HTTP 429 — back off; retryAfterSeconds is null when CMC sent no Retry-After.
 *     console.warn(`CoinMarketCap rate-limited; retry in ${error.retryAfterSeconds ?? 60}s`)
 *   } else {
 *     throw error
 *   }
 * }
 * ```
 *
 * @remarks
 * - **The id round-trip holds.** An id from `listCoins()` /
 *   `listSupportedSymbols()` — CMC's NUMERIC id (`'1'` for BTC) — is a valid
 *   input to `getPrice()` / `getHistorical()` / `getMarketStats()`, per the
 *   core {@link CoinId} contract. Those methods dispatch on the id shape: a
 *   purely-numeric id is sent as CoinMarketCap's `id=` query parameter,
 *   anything else as `symbol=` — so passing a ticker symbol (`'BTC'`) works
 *   too.
 * - The bond does not fail fast on a missing key: without
 *   `COINMARKETCAP_API_KEY` the auth header is simply omitted and every call
 *   surfaces CoinMarketCap's raw HTTP 401. `COINMARKETCAP_BASE_URL` (optional)
 *   overrides the Pro v1 endpoint.
 * - **Wire it through the core** (`setProvider(...)` from `@molecule/api-crypto-prices`) and call
 *   the core functions. The lazy `provider` export reads `COINMARKETCAP_API_KEY` /
 *   `COINMARKETCAP_BASE_URL` from `process.env`; `createProvider()` uses only what you pass.
 * - `vsCurrency` is lowercase on the core API (`'usd'`, the default); the bond upper-cases it for
 *   CoinMarketCap's `convert` parameter. `timeout` is milliseconds (default `10000`).
 * - **Free-tier credits are small.** Cache results (e.g. `@molecule/api-cache` `getOrSet`)
 *   instead of calling per request; `getHistorical()` uses CMC's `quotes/historical` endpoint,
 *   which the free Basic plan does not include (it fails with an HTTP error, not an empty list).
 * - HTTP 429 raises `CoinMarketCapRateLimitedError` (code `RATE_LIMITED`,
 *   `retryAfterSeconds` parsed from `Retry-After`) — catch on the code, not
 *   the message.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
