/**
 * DataTable provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete data-table implementation.
 *
 * @module
 */

/**
 *
 */
export interface DataTableProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface DataTableConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
