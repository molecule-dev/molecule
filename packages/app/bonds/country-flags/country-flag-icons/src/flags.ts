/**
 * The flag set, sourced from the `country-flag-icons` library (MIT).
 *
 * @module
 */

import { CN, EU, US } from 'country-flag-icons/string/3x2'

import type { CountryFlagSet } from '@molecule/app-country-flags'

/** All flags in this set share the library's 3:2 rectangle. */
const ASPECT_RATIO = 1.5

/**
 * Rectangular 3:2 flags from `country-flag-icons`, keyed by UPPERCASE ISO
 * 3166-1 alpha-2 code (plus the `EU` pseudo-code).
 *
 * Deliberately a curated subset, not the library's full ~250 flags: each entry
 * is inlined SVG markup that ships in every consuming bundle, and large
 * emblem-heavy flags run to hundreds of KB. Add codes here (one import + one
 * entry) as products need them.
 */
export const countryFlags: CountryFlagSet = {
  US: { svg: US, aspectRatio: ASPECT_RATIO },
  CN: { svg: CN, aspectRatio: ASPECT_RATIO },
  EU: { svg: EU, aspectRatio: ASPECT_RATIO },
}
