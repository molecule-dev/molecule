/**
 * Equity-prices provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-equity-prices-alpha-vantage`,
 * `@molecule/api-equity-prices-iex`, `@molecule/api-equity-prices-polygon`)
 * call `setProvider()` during application startup. Application code uses
 * the convenience functions (`getQuote`, `getHistorical`, `getFundamentals`,
 * `searchSymbol`, `listSupportedExchanges`) which delegate to the bonded
 * provider via `@molecule/api-bond`.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type {
  EquityFundamentals,
  EquityHistoricalBar,
  EquityHistoricalRange,
  EquityPricesProvider,
  EquityQuote,
  EquitySymbol,
  EquitySymbolMatch,
  ExchangeCode,
} from './types.js'

const BOND_TYPE = 'equity-prices'
expectBond(BOND_TYPE)

/**
 * Registers an equity-prices provider as the active singleton. Called by
 * bond packages (e.g. `@molecule/api-equity-prices-alpha-vantage`) during
 * application startup.
 *
 * @param provider - The equity-prices provider implementation to bond.
 */
export const setProvider = (provider: EquityPricesProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded equity-prices provider, throwing if none is
 * configured.
 *
 * @returns The bonded equity-prices provider.
 * @throws {Error} If no equity-prices provider has been bonded.
 */
export const getProvider = (): EquityPricesProvider => {
  try {
    return bondRequire<EquityPricesProvider>(BOND_TYPE)
  } catch (_error) {
    throw new Error(
      t('equityPrices.error.noProvider', undefined, {
        defaultValue: 'Equity-prices provider not configured. Call setProvider() first.',
      }),
      { cause: _error },
    )
  }
}

/**
 * Checks whether an equity-prices provider is currently bonded.
 *
 * @returns `true` if an equity-prices provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Returns the latest available quote for {@link symbol} using the bonded
 * provider.
 *
 * @param symbol - Ticker symbol to quote.
 * @returns Latest {@link EquityQuote}.
 * @throws {Error} If no equity-prices provider has been bonded.
 */
export const getQuote = async (symbol: EquitySymbol): Promise<EquityQuote> => {
  return getProvider().getQuote(symbol)
}

/**
 * Returns historical close-price bars for {@link symbol} over {@link range}
 * using the bonded provider. Bars are returned in ascending chronological
 * order.
 *
 * @param symbol - Ticker symbol to load history for.
 * @param range - Time range to cover.
 * @returns Array of {@link EquityHistoricalBar} in ascending order.
 * @throws {Error} If no equity-prices provider has been bonded.
 */
export const getHistorical = async (
  symbol: EquitySymbol,
  range: EquityHistoricalRange,
): Promise<EquityHistoricalBar[]> => {
  return getProvider().getHistorical(symbol, range)
}

/**
 * Returns trailing fundamentals for {@link symbol} using the bonded
 * provider.
 *
 * @param symbol - Ticker symbol to load fundamentals for.
 * @returns snapshot.
 * @throws {Error} If no equity-prices provider has been bonded.
 */
export const getFundamentals = async (symbol: EquitySymbol): Promise<EquityFundamentals> => {
  return getProvider().getFundamentals(symbol)
}

/**
 * Searches the bonded provider's symbol catalogue for matches against
 * {@link query}.
 *
 * @param query - Free-text search string.
 * @returns Array of {@link EquitySymbolMatch}, possibly empty.
 * @throws {Error} If no equity-prices provider has been bonded.
 */
export const searchSymbol = async (query: string): Promise<EquitySymbolMatch[]> => {
  return getProvider().searchSymbol(query)
}

/**
 * Lists the exchanges the bonded provider currently supports.
 *
 * @returns Array of exchange identifiers.
 * @throws {Error} If no equity-prices provider has been bonded.
 */
export const listSupportedExchanges = async (): Promise<ExchangeCode[]> => {
  return getProvider().listSupportedExchanges()
}
