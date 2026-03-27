/**
 * PDFKit PDF provider configuration types.
 *
 * @module
 */

/**
 * Configuration options for the PDFKit PDF provider.
 */
export interface PDFKitConfig {
  /**
   * Default font to use for text rendering.
   * Must be a standard PDF font or a path to a font file.
   * Defaults to `'Helvetica'`.
   */
  defaultFont?: string

  /**
   * Default font size in points.
   * Defaults to `12`.
   */
  defaultFontSize?: number

  /**
   * Default line height multiplier.
   * Defaults to `1.2`.
   */
  lineHeight?: number

  /**
   * Opening delimiter for simple template interpolation in `fromTemplate`.
   * Defaults to `'{{'`.
   */
  templateOpenDelimiter?: string

  /**
   * Closing delimiter for simple template interpolation in `fromTemplate`.
   * Defaults to `'}}'`.
   */
  templateCloseDelimiter?: string
}
