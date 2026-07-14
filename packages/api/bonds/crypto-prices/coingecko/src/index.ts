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
 * import { setProvider } from '@molecule/api-crypto-prices'
 * import { provider } from '@molecule/api-crypto-prices-coingecko'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
