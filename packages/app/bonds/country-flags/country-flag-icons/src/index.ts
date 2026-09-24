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
 * import { getCountryFlag, setCountryFlags } from '@molecule/app-country-flags'
 * import { countryFlags } from '@molecule/app-country-flags-country-flag-icons'
 *
 * // Startup: bond the flag set once.
 * setCountryFlags(countryFlags)
 *
 * // Anywhere: look up by ISO code (case-insensitive) and size from aspectRatio.
 * const flagHtml = (code: string, height = 16): string => {
 *   const flag = getCountryFlag(code)
 *   if (!flag) return code.toUpperCase() // text fallback — the set is a curated subset
 *   const width = Math.round(height * flag.aspectRatio) // 3:2 → 24×16
 *   return flag.svg.replace('<svg', `<svg width="${width}" height="${height}" role="img"`)
 * }
 *
 * console.log(flagHtml('us')) // '<svg width="24" height="16" role="img" …>…</svg>'
 * console.log(flagHtml('fr')) // 'FR' — not in this set
 * ```
 *
 * @remarks
 * - **Only `US`, `CN` and `EU` are included.** Every other code returns `undefined` from
 *   `getCountryFlag()` — always render a text fallback. To add a flag without forking, bond
 *   an extended set: `setCountryFlags({ ...countryFlags, FR: { svg, aspectRatio: 1.5 } })`.
 * - The export is the data object `countryFlags` — there is no `provider`/`createProvider`,
 *   and it is wired with the core's `setCountryFlags()`, not `setProvider()`.
 * - The SVG markup has viewBox-only sizing (no width/height attributes) — size
 *   it at render time via `CountryFlagData.aspectRatio` (always `1.5` here).
 * - Swapping flag artwork (a different library, custom flags, 1:1 icons) means
 *   swapping this bond; consumers of `getCountryFlag()` are unaffected.
 *
 * @module
 */

export * from './flags.js'
