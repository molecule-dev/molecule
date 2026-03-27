/**
 * Type definitions for import/export core interface.
 *
 * @module
 */

/**
 * Filter operators for export queries.
 */
export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'notIn'
  | 'between'
  | 'like'

/**
 * A single filter condition for export queries.
 */
export interface Filter {
  /** The field name to filter on. */
  field: string

  /** The comparison operator. */
  operator: FilterOperator

  /** The value to compare against. */
  value: unknown
}

/**
 * Sort direction for export queries.
 */
export interface OrderBy {
  /** The field name to sort by. */
  field: string

  /** The sort direction. */
  direction: 'asc' | 'desc'
}

/**
 * Query options for export operations.
 */
export interface ExportQuery {
  /** Filters to apply to the exported data. */
  filters?: Filter[]

  /** Columns to include in the export (defaults to all). */
  columns?: string[]

  /** Sort order for the exported rows. */
  orderBy?: OrderBy[]

  /** Maximum number of rows to export. */
  limit?: number
}

/**
 * Options for import operations.
 */
export interface ImportOptions {
  /** Column name mapping from source to destination (`{ sourceCol: destCol }`). */
  mapping?: Record<string, string>

  /** Whether to skip rows that would cause duplicate key violations. */
  skipDuplicates?: boolean

  /** Number of rows to process per batch. */
  batchSize?: number

  /**
   * Optional row validation function. Return `true` to accept the row,
   * `false` to skip it.
   *
   * @param row - The parsed row data.
   * @returns Whether the row should be imported.
   */
  validateRow?: (row: Record<string, unknown>) => boolean

  /**
   * Progress callback invoked after each batch is processed.
   *
   * @param progress - Current import progress.
   */
  onProgress?: (progress: ImportProgress) => void
}

/**
 * Describes an error that occurred while importing a specific row.
 */
export interface ImportError {
  /** The 1-based row number where the error occurred. */
  row: number

  /** The field name that caused the error, if applicable. */
  field?: string

  /** A human-readable description of the error. */
  message: string
}

/**
 * Progress information for an in-flight import operation.
 */
export interface ImportProgress {
  /** Number of rows processed so far. */
  processed: number

  /** Total number of rows to process. */
  total: number

  /** Completion percentage (0-100). */
  percentage: number
}

/**
 * Result of a completed import operation.
 */
export interface ImportResult {
  /** Unique identifier for the import job. */
  jobId: string

  /** Total number of rows in the source data. */
  totalRows: number

  /** Number of rows successfully imported. */
  importedRows: number

  /** Number of rows skipped (duplicates, validation failures, etc.). */
  skippedRows: number

  /** Errors encountered during import. */
  errors: ImportError[]
}

/**
 * Status of an import job.
 */
export type ImportJobStatus = {
  /** Unique identifier for the import job. */
  jobId: string

  /** Current status of the job. */
  status: 'pending' | 'processing' | 'completed' | 'failed'

  /** Current progress, if the job is in progress. */
  progress?: ImportProgress

  /** Final result, if the job has completed. */
  result?: ImportResult

  /** Error message, if the job has failed. */
  error?: string
}

/**
 * Import/export provider interface.
 *
 * All import/export providers must implement this interface.
 */
export interface ImportExportProvider {
  /**
   * Imports CSV data into the specified table.
   *
   * @param table - Target table name.
   * @param data - CSV data as a Buffer or ReadableStream.
   * @param options - Import options (mapping, dedup, batching, validation).
   * @returns The import result with row counts and any errors.
   */
  importCSV(
    table: string,
    data: Buffer | ReadableStream,
    options?: ImportOptions,
  ): Promise<ImportResult>

  /**
   * Imports JSON data into the specified table.
   *
   * @param table - Target table name.
   * @param data - Array of objects to import.
   * @param options - Import options (mapping, dedup, batching, validation).
   * @returns The import result with row counts and any errors.
   */
  importJSON(table: string, data: unknown[], options?: ImportOptions): Promise<ImportResult>

  /**
   * Exports table data as CSV.
   *
   * @param table - Source table name.
   * @param query - Optional filters, column selection, ordering, and limit.
   * @returns A Buffer containing the CSV data.
   */
  exportCSV(table: string, query?: ExportQuery): Promise<Buffer>

  /**
   * Exports table data as JSON.
   *
   * @param table - Source table name.
   * @param query - Optional filters, column selection, ordering, and limit.
   * @returns An array of row objects.
   */
  exportJSON(table: string, query?: ExportQuery): Promise<unknown[]>

  /**
   * Exports table data as an Excel file.
   *
   * @param table - Source table name.
   * @param query - Optional filters, column selection, ordering, and limit.
   * @returns A Buffer containing the Excel file data.
   */
  exportExcel(table: string, query?: ExportQuery): Promise<Buffer>

  /**
   * Retrieves the status of an import job.
   *
   * @param jobId - The unique identifier of the import job.
   * @returns The current status of the job.
   */
  getJobStatus(jobId: string): Promise<ImportJobStatus>
}
