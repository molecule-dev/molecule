/**
 * Provider-agnostic crypto-prices interface for molecule.dev.
 *
 * Defines the {@link CryptoPricesProvider} interface for cryptocurrency
 * price lookups. Bond packages (CoinGecko, CoinMarketCap, Binance, etc.)
 * implement this interface. Application code uses the convenience
 * functions (`listCoins`, `getPrice`, `getHistorical`,
 * `listSupportedSymbols`, `getMarketStats`) which delegate to the bonded
 * provider.
 *
 * Quote currencies (`'usd'`, `'eur'`, `'btc'`, ...) are conventionally
 * lower-case to match common upstream APIs.
 *
 * @example
 * ```typescript
 * import { setProvider, getPrice, listCoins } from '@molecule/api-crypto-prices'
 * import { provider as coingecko } from '@molecule/api-crypto-prices-coingecko'
 *
 * setProvider(coingecko)
 * const top = await listCoins({ limit: 50 })
 * const btc = await getPrice('bitcoin', 'usd')
 * ```
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
