/**
 * CSV import/export provider configuration types.
 *
 * @module
 */

/**
 * Configuration options for the CSV import/export provider.
 */
export interface CsvProviderOptions {
  /** CSV field delimiter character. Defaults to `','`. */
  delimiter?: string

  /** Maximum number of rows to process per batch during import. Defaults to `1000`. */
  defaultBatchSize?: number

  /** Maximum number of rows to export in a single query. Defaults to `50000`. */
  maxExportRows?: number
}
