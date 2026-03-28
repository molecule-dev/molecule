# @molecule/api-import-export-csv

CSV import/export provider for molecule.dev.

Implements the {@link ImportExportProvider} contract using pure TypeScript
CSV parsing/formatting and the bonded `@molecule/api-database` DataStore
for all database operations.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-import-export-csv
```

## Usage

```typescript
import { setProvider } from '@molecule/api-import-export'
import { provider } from '@molecule/api-import-export-csv'

// Wire the CSV provider at startup
setProvider(provider)
```

## API

### Interfaces

#### `CsvProviderOptions`

Configuration options for the CSV import/export provider.

```typescript
interface CsvProviderOptions {
  /** CSV field delimiter character. Defaults to `','`. */
  delimiter?: string

  /** Maximum number of rows to process per batch during import. Defaults to `1000`. */
  defaultBatchSize?: number

  /** Maximum number of rows to export in a single query. Defaults to `50000`. */
  maxExportRows?: number
}
```

### Functions

#### `createProvider(options)`

Creates a CSV import/export provider instance.

Uses the bonded `@molecule/api-database` DataStore for all database
operations. CSV parsing/formatting is done in pure TypeScript with
no native dependencies.

```typescript
function createProvider(options?: CsvProviderOptions): ImportExportProvider
```

- `options` — Provider configuration options.

**Returns:** A fully configured `ImportExportProvider` implementation.

#### `formatCSV(rows, columns, delimiter)`

Formats an array of row objects into a CSV string.

```typescript
function formatCSV(rows: Record<string, unknown>[], columns?: string[], delimiter?: string): string
```

- `rows` — Array of row objects to format.
- `columns` — Optional ordered list of column names. Defaults to all keys of the first row.
- `delimiter` — Field delimiter character. Defaults to `','`.

**Returns:** CSV-formatted string.

#### `formatExcel(rows, columns)`

Formats row objects as an XML Spreadsheet 2003 document (opens in Excel/LibreOffice).

```typescript
function formatExcel(rows: Record<string, unknown>[], columns?: string[]): string
```

- `rows` — Array of row objects to format.
- `columns` — Optional ordered list of column names.

**Returns:** XML Spreadsheet string.

#### `parseCSV(text, delimiter)`

Parses a CSV string into an array of row objects using the header row as keys.

```typescript
function parseCSV(text: string, delimiter?: string): Record<string, string>[]
```

- `text` — The CSV text to parse.
- `delimiter` — Field delimiter character. Defaults to `','`.

**Returns:** Array of parsed row objects keyed by header names.

### Constants

#### `provider`

Default lazily-initialized CSV import/export provider.
Uses the bonded DataStore for database operations.

```typescript
const provider: ImportExportProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-import-export` ^1.0.0
