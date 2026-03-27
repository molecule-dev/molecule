/**
 * Pdf provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete pdf implementation.
 *
 * @module
 */

/**
 *
 */
export interface PdfProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface PdfConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
