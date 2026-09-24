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
 * // Flag markup sized from aspectRatio, with a TEXT fallback when the set lacks the code.
 * const flagHtml = (code: string, height = 16): string => {
 *   const flag = getCountryFlag(code) // case-insensitive; undefined = no flag, never throws
 *   if (!flag) return code.toUpperCase()
 *   const width = Math.round(height * flag.aspectRatio)
 *   return flag.svg.replace('<svg', `<svg width="${width}" height="${height}" role="img"`)
 * }
 *
 * console.log(flagHtml('us')) // '<svg width="24" height="16" role="img" xmlns=… viewBox=…>…</svg>'
 * console.log(flagHtml('fr')) // 'FR' — not in the default curated set
 * ```
 *
 * @remarks
 * - **`getCountryFlag()` never throws** — flags are decorative, so an unbonded
 *   set or unknown code returns `undefined`. Always render a textual fallback
 *   (typically the code itself) for the `undefined` case instead of assuming a
 *   flag exists.
 * - **The default `country-flag-icons` bond is a CURATED subset (US, CN, EU today),
 *   not every country** — `getCountryFlag('fr')` returns `undefined` until that
 *   code is added to the bond's `src/flags.ts`. The text fallback is not optional.
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
