/**
 * `country-flag-icons` flag set bond for molecule.dev.
 *
 * Provides rectangular 3:2 SVG flags from the `country-flag-icons` library
 * (MIT) as a `CountryFlagSet` for `@molecule/app-country-flags`. A curated
 * subset (US, CN, EU today) rather than all ~250 flags, because every entry is
 * inlined SVG that ships in the consuming bundle — extend `src/flags.ts` with
 * one import + one entry per additional code.
 *
 * @example
 * ```typescript
 * import { setCountryFlags } from '@molecule/app-country-flags'
 * import { countryFlags } from '@molecule/app-country-flags-country-flag-icons'
 *
 * setCountryFlags(countryFlags) // once, at app startup
 * ```
 *
 * @remarks
 * - The SVG markup has viewBox-only sizing (no width/height attributes) — size
 *   it at render time via `CountryFlagData.aspectRatio` (always `1.5` here).
 * - Swapping flag artwork (a different library, custom flags, 1:1 icons) means
 *   swapping this bond; consumers of `getCountryFlag()` are unaffected.
 *
 * @module
 */

export * from './flags.js'
