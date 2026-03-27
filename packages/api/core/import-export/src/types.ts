/**
 * ImportExport provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete import-export implementation.
 *
 * @module
 */

/**
 *
 */
export interface ImportExportProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface ImportExportConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
