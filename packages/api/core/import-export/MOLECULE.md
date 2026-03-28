# @molecule/api-import-export

Data import/export core interface for molecule.dev.

Defines the abstract {@link ImportExportProvider} contract and convenience
functions for importing CSV/JSON data, exporting to CSV/JSON/Excel, and
tracking asynchronous import job status.

## Type
`core`

## Installation
```bash
npm install @molecule/api-import-export
```

## Usage

```typescript
import { setProvider, importCSV, exportJSON, getJobStatus } from '@molecule/api-import-export'
import { provider } from '@molecule/api-import-export-csv'

// Wire the provider at startup
setProvider(provider)

// Import CSV data
const result = await importCSV('users', csvBuffer, {
  mapping: { 'Full Name': 'name', 'Email Address': 'email' },
  skipDuplicates: true,
})

// Export data as JSON
const rows = await exportJSON('users', {
  filters: [{ field: 'active', operator: 'eq', value: true }],
  columns: ['name', 'email'],
})

// Check import job status
const status = await getJobStatus(result.jobId)
```

## API

### Interfaces

#### `ExportQuery`

Query options for export operations.

```typescript
interface ExportQuery {
  /** Filters to apply to the exported data. */
  filters?: Filter[]

  /** Columns to include in the export (defaults to all). */
  columns?: string[]

  /** Sort order for the exported rows. */
  orderBy?: OrderBy[]

  /** Maximum number of rows to export. */
  limit?: number
}
```

#### `Filter`

A single filter condition for export queries.

```typescript
interface Filter {
  /** The field name to filter on. */
  field: string

  /** The comparison operator. */
  operator: FilterOperator

  /** The value to compare against. */
  value: unknown
}
```

#### `ImportError`

Describes an error that occurred while importing a specific row.

```typescript
interface ImportError {
  /** The 1-based row number where the error occurred. */
  row: number

  /** The field name that caused the error, if applicable. */
  field?: string

  /** A human-readable description of the error. */
  message: string
}
```

#### `ImportExportProvider`

Import/export provider interface.

All import/export providers must implement this interface.

```typescript
interface ImportExportProvider {
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
```

#### `ImportOptions`

Options for import operations.

```typescript
interface ImportOptions {
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
```

#### `ImportProgress`

Progress information for an in-flight import operation.

```typescript
interface ImportProgress {
  /** Number of rows processed so far. */
  processed: number

  /** Total number of rows to process. */
  total: number

  /** Completion percentage (0-100). */
  percentage: number
}
```

#### `ImportResult`

Result of a completed import operation.

```typescript
interface ImportResult {
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
```

#### `OrderBy`

Sort direction for export queries.

```typescript
interface OrderBy {
  /** The field name to sort by. */
  field: string

  /** The sort direction. */
  direction: 'asc' | 'desc'
}
```

### Types

#### `FilterOperator`

Filter operators for export queries.

```typescript
type FilterOperator =
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
```

#### `ImportJobStatus`

Status of an import job.

```typescript
type ImportJobStatus = {
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
```

### Functions

#### `exportCSV(table, query)`

Exports table data as CSV.

```typescript
function exportCSV(table: string, query?: ExportQuery): Promise<Buffer<ArrayBufferLike>>
```

- `table` — Source table name.
- `query` — Optional filters, column selection, ordering, and limit.

**Returns:** A Buffer containing the CSV data.

#### `exportExcel(table, query)`

Exports table data as an Excel file.

```typescript
function exportExcel(table: string, query?: ExportQuery): Promise<Buffer<ArrayBufferLike>>
```

- `table` — Source table name.
- `query` — Optional filters, column selection, ordering, and limit.

**Returns:** A Buffer containing the Excel file data.

#### `exportJSON(table, query)`

Exports table data as JSON.

```typescript
function exportJSON(table: string, query?: ExportQuery): Promise<unknown[]>
```

- `table` — Source table name.
- `query` — Optional filters, column selection, ordering, and limit.

**Returns:** An array of row objects.

#### `getJobStatus(jobId)`

Retrieves the status of an import job.

```typescript
function getJobStatus(jobId: string): Promise<ImportJobStatus>
```

- `jobId` — The unique identifier of the import job.

**Returns:** The current status of the job.

#### `getProvider()`

Retrieves the bonded import/export provider, throwing if none is configured.

```typescript
function getProvider(): ImportExportProvider
```

**Returns:** The bonded import/export provider.

#### `hasProvider()`

Checks whether an import/export provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if an import/export provider is bonded.

#### `importCSV(table, data, options)`

Imports CSV data into the specified table.

```typescript
function importCSV(table: string, data: Buffer<ArrayBufferLike> | ReadableStream<any>, options?: ImportOptions): Promise<ImportResult>
```

- `table` — Target table name.
- `data` — CSV data as a Buffer or ReadableStream.
- `options` — Import options (mapping, dedup, batching, validation).

**Returns:** The import result with row counts and any errors.

#### `importJSON(table, data, options)`

Imports JSON data into the specified table.

```typescript
function importJSON(table: string, data: unknown[], options?: ImportOptions): Promise<ImportResult>
```

- `table` — Target table name.
- `data` — Array of objects to import.
- `options` — Import options (mapping, dedup, batching, validation).

**Returns:** The import result with row counts and any errors.

#### `setProvider(provider)`

Registers an import/export provider as the active singleton. Called by bond
packages during application startup.

```typescript
function setProvider(provider: ImportExportProvider): void
```

- `provider` — The import/export provider implementation to bond.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
