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
 * @module
 */

export * from './provider.js'
export * from './types.js'
