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
 * @remarks
 * - **Server-side only.** Price lookups run in API handlers/jobs — provider
 *   API keys are secrets and never reach the browser. Expose an app endpoint
 *   that returns exactly the data the UI needs.
 * - **`CoinId` is provider-specific — never hardcode one provider's ids.**
 *   `'bitcoin'` is a CoinGecko id; other providers key coins differently.
 *   Resolve ids at runtime (`listCoins()` / `listSupportedSymbols()`) or store
 *   the id the bonded provider returned, so swapping bonds doesn't silently
 *   break lookups.
 * - **Cache aggressively.** Free upstream tiers are heavily rate-limited — a
 *   `getPrice()` per page render gets the app throttled. Cache quotes
 *   server-side (seconds–minutes of staleness is fine for display) and prefer
 *   one `listCoins()` over N `getPrice()` calls.
 * - `getHistorical(id, days)` takes a positive integer count of days back from
 *   now (`7`, `30`, `365`) — not a date or a range string.
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
