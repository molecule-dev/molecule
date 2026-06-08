/**
 * Crypto-prices provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-crypto-prices-coingecko`) call
 * `setProvider()` during application startup. Application code uses the
 * convenience functions (`listCoins`, `getPrice`, `getHistorical`,
 * `listSupportedSymbols`, `getMarketStats`) which delegate to the bonded
 * provider via `@molecule/api-bond`.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type {
  CoinId,
  CoinMarketRow,
  CoinMarketStats,
  CoinPricePoint,
  CoinPriceQuote,
  CryptoPricesProvider,
  HistoricalDays,
  ListCoinsOptions,
  VsCurrency,
} from './types.js'

const BOND_TYPE = 'crypto-prices'
expectBond(BOND_TYPE)

/**
 * Registers a crypto-prices provider as the active singleton. Called by
 * bond packages (e.g. `@molecule/api-crypto-prices-coingecko`) during
 * application startup.
 *
 * @param provider - The crypto-prices provider implementation to bond.
 */
export const setProvider = (provider: CryptoPricesProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded crypto-prices provider, throwing if none is
 * configured.
 *
 * @returns The bonded crypto-prices provider.
 * @throws {Error} If no crypto-prices provider has been bonded.
 */
export const getProvider = (): CryptoPricesProvider => {
  try {
    return bondRequire<CryptoPricesProvider>(BOND_TYPE)
  } catch (error) {
    throw new Error(
      t('cryptoPrices.error.noProvider', undefined, {
        defaultValue: 'Crypto-prices provider not configured. Call setProvider() first.',
      }),
      { cause: error },
    )
  }
}

/**
 * Checks whether a crypto-prices provider is currently bonded.
 *
 * @returns `true` if a crypto-prices provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Lists coins ranked by market-cap (or by the supplied `order`).
 *
 * @param options - Pagination, sort, and quote-currency options.
 * @returns Array of coin market rows.
 * @throws {Error} If no crypto-prices provider has been bonded.
 */
export const listCoins = async (options?: ListCoinsOptions): Promise<CoinMarketRow[]> => {
  return getProvider().listCoins(options)
}

/**
 * Gets the latest spot price for a single coin.
 *
 * @param id - Provider-specific coin identifier (e.g. `'bitcoin'`).
 * @param vsCurrency - Quote currency. Defaults to `'usd'` when omitted.
 * @returns Single quote with price and 24h change.
 * @throws {Error} If no crypto-prices provider has been bonded.
 */
export const getPrice = async (id: CoinId, vsCurrency?: VsCurrency): Promise<CoinPriceQuote> => {
  return getProvider().getPrice(id, vsCurrency)
}

/**
 * Gets a historical price series for a coin over the last `days` days.
 *
 * @param id - Provider-specific coin identifier.
 * @param days - Window size in days back from now (e.g. `7`, `30`).
 * @param vsCurrency - Quote currency. Defaults to `'usd'` when omitted.
 * @returns Array of `(ts, price)` samples in chronological order.
 * @throws {Error} If no crypto-prices provider has been bonded.
 */
export const getHistorical = async (
  id: CoinId,
  days: HistoricalDays,
  vsCurrency?: VsCurrency,
): Promise<CoinPricePoint[]> => {
  return getProvider().getHistorical(id, days, vsCurrency)
}

/**
 * Lists every coin identifier the bonded provider currently supports.
 *
 * @returns Array of provider-specific coin identifiers.
 * @throws {Error} If no crypto-prices provider has been bonded.
 */
export const listSupportedSymbols = async (): Promise<CoinId[]> => {
  return getProvider().listSupportedSymbols()
}

/**
 * Returns aggregate market statistics for a single coin (price, market-cap,
 * volume, supply).
 *
 * @param id - Provider-specific coin identifier.
 * @param vsCurrency - Quote currency. Defaults to `'usd'` when omitted.
 * @returns Aggregate market statistics snapshot.
 * @throws {Error} If no crypto-prices provider has been bonded.
 */
export const getMarketStats = async (
  id: CoinId,
  vsCurrency?: VsCurrency,
): Promise<CoinMarketStats> => {
  return getProvider().getMarketStats(id, vsCurrency)
}
