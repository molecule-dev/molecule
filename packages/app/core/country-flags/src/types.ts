/**
 * Country/region flag interfaces for molecule.dev.
 *
 * @module
 */

/** A single country/region flag as framework-agnostic SVG markup. */
export interface CountryFlagData {
  /**
   * Complete rectangular SVG markup with viewBox-only sizing — consumers set
   * the rendered width/height (e.g. by injecting attributes or via a sized
   * wrapper element).
   */
  svg: string
  /** Width divided by height, e.g. `1.5` for a 3:2 rectangle. */
  aspectRatio: number
}

/**
 * Flags keyed by UPPERCASE ISO 3166-1 alpha-2 code (`'US'`, `'CN'`), including
 * the pseudo-codes flag libraries commonly ship (e.g. `'EU'`).
 */
export type CountryFlagSet = Record<string, CountryFlagData>
