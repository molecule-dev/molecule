/**
 * Framework-agnostic country/region flag interfaces for molecule.dev.
 *
 * Flag bond packages (e.g. `@molecule/app-country-flags-country-flag-icons`)
 * export a `CountryFlagSet` object which is bonded via {@link setCountryFlags}
 * at application startup. Application code retrieves flags via
 * {@link getCountryFlag}.
 *
 * @example
 * ```typescript
 * import { getCountryFlag, setCountryFlags } from '@molecule/app-country-flags'
 * import { countryFlags } from '@molecule/app-country-flags-country-flag-icons'
 *
 * setCountryFlags(countryFlags) // once, at app startup
 *
 * const flag = getCountryFlag('us')
 * if (flag) {
 *   // flag.svg is complete rectangular SVG markup (viewBox-only sizing);
 *   // flag.aspectRatio (width / height) sizes the rendered element.
 * }
 * ```
 *
 * @remarks
 * - **`getCountryFlag()` never throws** — flags are decorative, so an unbonded
 *   set or unknown code returns `undefined`. Always render a textual fallback
 *   (typically the code itself) for the `undefined` case instead of assuming a
 *   flag exists.
 * - Codes are ISO 3166-1 alpha-2 and case-insensitive on lookup; sets are
 *   keyed UPPERCASE. Pseudo-codes flag libraries ship (e.g. `'EU'`) are valid
 *   set keys too.
 * - The SVG markup intentionally has no width/height attributes — inject them
 *   (or size a wrapper) at render time using `aspectRatio`.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
