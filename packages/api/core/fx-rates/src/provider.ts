/**
 * FX-rates provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-fx-rates-ecb`) call `setProvider()` during
 * application startup. Application code uses the convenience functions
 * (`getRate`, `getDailyRates`, `convert`, `listSupportedCurrencies`) which
 * delegate to the bonded provider via `@molecule/api-bond`.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { CurrencyCode, FxDailyRates, FxRatesOptions, FxRatesProvider } from './types.js'

const BOND_TYPE = 'fx-rates'
expectBond(BOND_TYPE)

/**
 * Registers an FX-rates provider as the active singleton. Called by bond
 * packages (e.g. `@molecule/api-fx-rates-ecb`) during application startup.
 *
 * @param provider - The FX-rates provider implementation to bond.
 */
export const setProvider = (provider: FxRatesProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded FX-rates provider, throwing if none is configured.
 *
 * @returns The bonded FX-rates provider.
 * @throws {Error} If no FX-rates provider has been bonded.
 */
export const getProvider = (): FxRatesProvider => {
  try {
    return bondRequire<FxRatesProvider>(BOND_TYPE)
  } catch (_error) {
    throw new Error(
      t('fxRates.error.noProvider', undefined, {
        defaultValue: 'FX-rates provider not configured. Call setProvider() first.',
      }),
      { cause: _error },
    )
  }
}

/**
 * Checks whether an FX-rates provider is currently bonded.
 *
 * @returns `true` if an FX-rates provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Looks up the conversion rate `1 unit of from = rate units of to`.
 *
 * @param from - Source currency (ISO 4217).
 * @param to - Target currency (ISO 4217).
 * @param options - Optional asOf date for historical rates.
 * @returns The conversion ratio as a plain number.
 * @throws {Error} If no FX-rates provider has been bonded.
 */
export const getRate = async (
  from: CurrencyCode,
  to: CurrencyCode,
  options?: FxRatesOptions,
): Promise<number> => {
  return getProvider().getRate(from, to, options)
}

/**
 * Returns all reference rates the bonded provider publishes for the given day,
 * normalized against the provider's pivot currency.
 *
 * @param options - Optional asOf date for the daily snapshot.
 * @returns The full daily snapshot.
 * @throws {Error} If no FX-rates provider has been bonded.
 */
export const getDailyRates = async (options?: FxRatesOptions): Promise<FxDailyRates> => {
  return getProvider().getDailyRates(options)
}

/**
 * Converts an integer minor-unit amount (e.g. cents) from one currency to
 * another using the bonded provider.
 *
 * @param amountMinor - Amount in minor units of {@link from} (e.g. cents).
 * @param from - Source currency (ISO 4217).
 * @param to - Target currency (ISO 4217).
 * @param options - Optional asOf date for historical rates.
 * @returns Converted amount in minor units of {@link to}.
 * @throws {Error} If no FX-rates provider has been bonded.
 */
export const convert = async (
  amountMinor: number,
  from: CurrencyCode,
  to: CurrencyCode,
  options?: FxRatesOptions,
): Promise<number> => {
  return getProvider().convert(amountMinor, from, to, options)
}

/**
 * Lists every currency the bonded provider currently supports.
 *
 * @returns Array of ISO 4217 currency codes.
 * @throws {Error} If no FX-rates provider has been bonded.
 */
export const listSupportedCurrencies = async (): Promise<CurrencyCode[]> => {
  return getProvider().listSupportedCurrencies()
}
