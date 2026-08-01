/**
 * Country flag bond accessor and flag lookup functions.
 *
 * Flag bond packages (e.g. `@molecule/app-country-flags-country-flag-icons`)
 * export a `CountryFlagSet` object which is bonded via `setCountryFlags()`.
 * Application code uses `getCountryFlag()` to retrieve individual flags.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'

import type { CountryFlagData, CountryFlagSet } from './types.js'

const BOND_TYPE = 'country-flags'

/**
 * Registers a flag set as the active singleton. Called at application startup
 * to wire a flag library.
 *
 * @param flagSet - The flag set (a record of UPPERCASE codes to flag data).
 */
export function setCountryFlags(flagSet: CountryFlagSet): void {
  bond(BOND_TYPE, flagSet)
}

/**
 * Checks whether a flag set is currently bonded.
 *
 * @returns `true` if a flag set is bonded.
 */
export function hasCountryFlags(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Retrieves a single flag by country/region code from the bonded flag set.
 *
 * Deliberately non-throwing (unlike `@molecule/app-icons`' `getIcon()`): flags
 * are decorative, so a missing flag — unbonded set or unknown code — returns
 * `undefined` and the consumer renders its textual fallback (e.g. the code).
 *
 * @param code - ISO 3166-1 alpha-2 code (case-insensitive), e.g. `'us'`.
 * @returns The flag data, or `undefined` when no set is bonded or the code is
 *   not in the bonded set.
 */
export function getCountryFlag(code: string): CountryFlagData | undefined {
  const flagSet = bondGet<CountryFlagSet>(BOND_TYPE)
  return flagSet?.[code.toUpperCase()]
}
