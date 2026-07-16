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
 * import { setProvider } from '@molecule/api-crypto-prices'
 * import { provider } from '@molecule/api-crypto-prices-coinmarketcap'
 *
 * setProvider(provider)
 * ```
 *
 * @remarks
 * - **Pass ticker SYMBOLS (`'BTC'`, `'ETH'`) to `getPrice()` / `getHistorical()`
 *   / `getMarketStats()` — NOT the ids this bond returns.** Those methods send
 *   the id as CoinMarketCap's `symbol=` query parameter, while `listCoins()`
 *   and `listSupportedSymbols()` return CMC's NUMERIC ids (`'1'` for BTC).
 *   Feeding a returned id back into a quote method fails upstream (HTTP 400 /
 *   "no price data") — the core contract's id round-trip does not currently
 *   hold for this bond. Key everything by ticker symbol.
 * - The bond does not fail fast on a missing key: without
 *   `COINMARKETCAP_API_KEY` the auth header is simply omitted and every call
 *   surfaces CoinMarketCap's raw HTTP 401. `COINMARKETCAP_BASE_URL` (optional)
 *   overrides the Pro v1 endpoint.
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
